"""Characterization tests for the script source adapter.

Pins the dependency edges extracted from a script config (action targets,
device targets, legacy entity_id, data entity_id, script calls, template
references, nested choose/repeat) so the parser can be refactored safely.
"""

from __future__ import annotations

import pytest

from custom_components.entitymap.adapters.script import ScriptAdapter
from custom_components.entitymap.const import FragilityType
from custom_components.entitymap.fragility import detect_fragility
from custom_components.entitymap.models import DependencyGraph


class _Store:
    """Minimal stand-in for the script collection store."""

    def __init__(self, items):
        self._items = items

    def async_items(self):
        return self._items


_CONFIG = {
    "id": "my",
    "alias": "My Script",
    "sequence": [
        {"service": "light.turn_on", "target": {"entity_id": "light.l", "device_id": "dev1"}},
        {"service": "switch.toggle", "entity_id": "switch.legacy"},
        {"service": "fan.turn_on", "data": {"entity_id": "fan.d"}},
        {"service": "script.other"},
        {"service": "notify.x", "data": {"message": "{{ states('sensor.tmpl') }}"}},
        {"choose": [{"sequence": [{"service": "lock.lock", "target": {"entity_id": "lock.k"}}]}]},
        {"repeat": {"sequence": [{"service": "cover.open", "target": {"entity_id": "cover.c"}}]}},
    ],
}

_EXPECTED_EDGES = {
    ("script.my", "light.l", "action"),
    ("script.my", "device.dev1", "device_action"),
    ("script.my", "switch.legacy", "action"),
    ("script.my", "fan.d", "action"),
    ("script.my", "script.other", "service_call"),
    ("script.my", "sensor.tmpl", "template_reference"),
    ("script.my", "lock.k", "action"),
    ("script.my", "cover.c", "action"),
}


"""GIVEN a script exercising every supported action shape."""
@pytest.mark.asyncio
async def test_extracts_all_dependency_edges(mock_hass):

    mock_hass.data = {"script": _Store([_CONFIG])}
    graph = DependencyGraph()

    """WHEN the adapter populates the graph."""
    await ScriptAdapter(mock_hass).async_populate(graph)

    """THEN the full set of dependency edges is produced and the node is named."""
    edges = {(e.source, e.target, e.dependency_kind.value) for e in graph.edges}
    assert edges == _EXPECTED_EDGES
    assert graph.nodes["script.my"].title == "My Script"


class _Entity:
    """Minimal stand-in for a script entity exposing its raw config."""

    def __init__(self, entity_id, raw_config):
        self.entity_id = entity_id
        self.raw_config = raw_config


class _EntityComponent:
    """Minimal stand-in for the script entity component on current HA."""

    def __init__(self, entities):
        self.entities = entities


class _State:
    """Minimal stand-in for a script state object."""

    def __init__(self, entity_id, attributes):
        self.entity_id = entity_id
        self.attributes = attributes


_ENTITY_ID = "script.night_mode"


async def _populate(mock_hass, entities) -> DependencyGraph:
    """Run the adapter against an entity component holding the given entities."""
    mock_hass.data = {"script": _EntityComponent(entities)}
    graph = DependencyGraph()

    await ScriptAdapter(mock_hass).async_populate(graph)

    return graph


"""GIVEN a script entity on current HA exposing its config only as raw_config."""
@pytest.mark.asyncio
async def test_reads_raw_config_from_entity_component(mock_hass):

    config = {
        "alias": "Night mode",
        "sequence": [{"action": "light.turn_off", "target": {"entity_id": "light.all"}}],
    }

    """WHEN the adapter populates the graph."""
    graph = await _populate(mock_hass, [_Entity(_ENTITY_ID, config)])

    """THEN the script is linked under its entity_id and alias, and states are never read."""
    edges = {(e.source, e.target, e.dependency_kind.value) for e in graph.edges}
    assert edges == {(_ENTITY_ID, "light.all", "action")}
    assert graph.nodes[_ENTITY_ID].title == "Night mode"
    mock_hass.states.async_all.assert_not_called()


"""GIVEN a script with a visual-editor device action (top-level device_id, registry entity_id)."""
@pytest.mark.asyncio
async def test_top_level_device_action_links_device(mock_hass):

    config = {
        "alias": "Night mode",
        "sequence": [{"device_id": "dev_lock", "domain": "lock", "type": "lock", "entity_id": "a1b2c3"}],
    }

    """WHEN the graph is populated and fragility is detected."""
    graph = await _populate(mock_hass, [_Entity(_ENTITY_ID, config)])
    findings = [
        f for f in detect_fragility(graph) if f.fragility_type == FragilityType.DEVICE_ID_REFERENCE
    ]

    """THEN exactly one device-action edge is produced and a device_id finding raised."""
    edges = {(e.source, e.target, e.dependency_kind.value) for e in graph.edges}
    assert edges == {(_ENTITY_ID, "device.dev_lock", "device_action")}
    assert [(f.node_id, f.related_node_ids) for f in findings] == [
        (_ENTITY_ID, ("device.dev_lock",))
    ]


"""GIVEN an entity component that exposes no raw configs and no store."""
@pytest.mark.asyncio
async def test_falls_back_to_states_when_no_entity_has_raw_config(mock_hass):

    mock_hass.states.async_all.return_value = [_State(_ENTITY_ID, {"friendly_name": "Night mode"})]

    """WHEN the adapter populates the graph."""
    graph = await _populate(mock_hass, [_Entity(_ENTITY_ID, None)])

    """THEN it still falls back to the script states."""
    assert _ENTITY_ID in graph.nodes
    mock_hass.states.async_all.assert_called_once_with("script")
