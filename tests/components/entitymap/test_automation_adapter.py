"""Characterization tests for the automation source adapter.

These pin the full set of dependency edges extracted from an automation config
(triggers, conditions, actions, nested choose/repeat, templates) so the parser
can be refactored without changing behavior.
"""

from __future__ import annotations

import pytest

from custom_components.entitymap.adapters.automation import AutomationAdapter
from custom_components.entitymap.const import FragilityType
from custom_components.entitymap.fragility import detect_fragility
from custom_components.entitymap.models import DependencyGraph


class _Store:
    """Minimal stand-in for the automation collection store."""

    def __init__(self, items):
        self._items = items

    def async_items(self):
        return self._items


_CONFIG = {
    "id": "test",
    "alias": "Test Auto",
    "trigger": [
        {"platform": "device", "device_id": "dev1"},
        {"platform": "state", "entity_id": "sensor.a"},
        {"platform": "template", "value_template": "{{ states('sensor.tmpl') }}"},
    ],
    "condition": [
        {"condition": "state", "entity_id": "binary_sensor.c"},
        {"condition": "device", "device_id": "dev2"},
        {"condition": "template", "value_template": "{{ is_state('sensor.cond', 'on') }}"},
    ],
    "action": [
        {"service": "light.turn_on", "target": {"entity_id": "light.l", "device_id": "dev3"}},
        {"service": "script.my_script"},
        {"service": "scene.turn_on", "data": {"entity_id": "scene.s"}},
        {"choose": [{"sequence": [{"service": "switch.turn_on", "target": {"entity_id": "switch.w"}}]}]},
        {"repeat": {"sequence": [{"service": "fan.turn_on", "target": {"entity_id": "fan.f"}}]}},
        {"service": "light.toggle", "entity_id": "light.legacy"},
        {"service": "input_boolean.turn_on", "data": {"entity_id": "input_boolean.d"}},
    ],
}

_EXPECTED_EDGES = {
    ("automation.test", "device.dev1", "device_trigger"),
    ("automation.test", "sensor.a", "trigger"),
    ("automation.test", "sensor.tmpl", "template_reference"),
    ("automation.test", "binary_sensor.c", "condition"),
    ("automation.test", "device.dev2", "device_condition"),
    ("automation.test", "sensor.cond", "template_reference"),
    ("automation.test", "light.l", "action"),
    ("automation.test", "device.dev3", "device_action"),
    ("automation.test", "script.my_script", "service_call"),
    ("automation.test", "scene.s", "service_call"),
    ("automation.test", "scene.s", "action"),
    ("automation.test", "switch.w", "action"),
    ("automation.test", "fan.f", "action"),
    ("automation.test", "light.legacy", "action"),
    ("automation.test", "input_boolean.d", "action"),
}


"""GIVEN an automation exercising every supported config shape."""
@pytest.mark.asyncio
async def test_extracts_all_dependency_edges(mock_hass):

    mock_hass.data = {"automation": _Store([_CONFIG])}
    graph = DependencyGraph()

    """WHEN the adapter populates the graph."""
    await AutomationAdapter(mock_hass).async_populate(graph)

    """THEN the full set of dependency edges is produced and the node is named."""
    edges = {(e.source, e.target, e.dependency_kind.value) for e in graph.edges}
    assert edges == _EXPECTED_EDGES
    assert graph.nodes["automation.test"].title == "Test Auto"


class _Entity:
    """Minimal stand-in for an automation entity exposing its raw config."""

    def __init__(self, entity_id, raw_config):
        self.entity_id = entity_id
        self.raw_config = raw_config


class _EntityComponent:
    """Minimal stand-in for the automation entity component on current HA."""

    def __init__(self, entities):
        self.entities = entities


class _State:
    """Minimal stand-in for an automation state object."""

    def __init__(self, entity_id, attributes):
        self.entity_id = entity_id
        self.attributes = attributes


_ENTITY_ID = "automation.hall_light"


async def _populate(mock_hass, entities) -> DependencyGraph:
    """Run the adapter against an entity component holding the given entities."""
    mock_hass.data = {"automation": _EntityComponent(entities)}
    graph = DependencyGraph()

    await AutomationAdapter(mock_hass).async_populate(graph)

    return graph


_SWITCH_ON = {"action": "switch.turn_on", "target": {"entity_id": "switch.fan"}}

_BUG_CASES = [
    pytest.param(
        {"triggers": [{"trigger": "device", "device_id": "dev_motion", "type": "motion"}]},
        {("device.dev_motion", "device_trigger")},
        id="ui_device_trigger",
    ),
    pytest.param(
        {"actions": [{"device_id": "dev_light", "domain": "light", "type": "turn_on", "entity_id": "4c1f0e2a9b"}]},
        {("device.dev_light", "device_action")},
        id="top_level_device_action",
    ),
    pytest.param(
        {"actions": [{"device_id": ["dev_a", "dev_b"], "domain": "light", "type": "turn_on"}]},
        {("device.dev_a", "device_action"), ("device.dev_b", "device_action")},
        id="top_level_device_action_list",
    ),
    pytest.param(
        {"actions": [{"choose": [{"conditions": [{"condition": "state", "entity_id": "binary_sensor.door", "state": "on"}], "sequence": [_SWITCH_ON]}]}]},
        {("binary_sensor.door", "condition"), ("switch.fan", "action")},
        id="choose_option_state_condition",
    ),
    pytest.param(
        {"actions": [{"choose": [{"conditions": [{"condition": "device", "device_id": "dev_door", "type": "is_open"}], "sequence": [_SWITCH_ON]}]}]},
        {("device.dev_door", "device_condition"), ("switch.fan", "action")},
        id="choose_option_device_condition",
    ),
    pytest.param(
        {"actions": [{"choose": {"conditions": {"condition": "state", "entity_id": "binary_sensor.door"}, "sequence": [_SWITCH_ON]}}]},
        {("binary_sensor.door", "condition"), ("switch.fan", "action")},
        id="choose_single_option_not_in_list",
    ),
    pytest.param(
        {"actions": [{"if": [{"condition": "state", "entity_id": "sun.sun", "state": "below_horizon"}], "then": [_SWITCH_ON], "else": [{"action": "light.turn_off", "target": {"entity_id": "light.porch"}}]}]},
        {("sun.sun", "condition"), ("switch.fan", "action"), ("light.porch", "action")},
        id="if_block_state_condition",
    ),
    pytest.param(
        {"actions": [{"if": {"condition": "state", "entity_id": "sun.sun"}, "then": _SWITCH_ON}]},
        {("sun.sun", "condition"), ("switch.fan", "action")},
        id="if_block_single_condition_and_action_not_in_list",
    ),
    pytest.param(
        {"actions": [{"if": [{"condition": "device", "device_id": "dev_door", "type": "is_open"}], "then": [_SWITCH_ON]}]},
        {("device.dev_door", "device_condition"), ("switch.fan", "action")},
        id="if_block_device_condition",
    ),
    pytest.param(
        {"actions": [{"if": [{"condition": "template", "value_template": "{{ is_state('input_boolean.guest', 'on') }}"}], "then": [_SWITCH_ON]}]},
        {("input_boolean.guest", "template_reference"), ("switch.fan", "action")},
        id="if_block_template_condition",
    ),
    pytest.param(
        {"actions": [{"if": "{{ now().hour > 20 }}", "then": [_SWITCH_ON]}]},
        {("switch.fan", "action")},
        id="if_block_shorthand_template_is_skipped",
    ),
    pytest.param(
        {"actions": [{"repeat": {"while": [{"condition": "state", "entity_id": "binary_sensor.motion", "state": "on"}], "sequence": [_SWITCH_ON]}}]},
        {("binary_sensor.motion", "condition"), ("switch.fan", "action")},
        id="repeat_while_condition",
    ),
    pytest.param(
        {"actions": [{"repeat": {"until": [{"condition": "state", "entity_id": "cover.garage", "state": "closed"}], "sequence": [_SWITCH_ON]}}]},
        {("cover.garage", "condition"), ("switch.fan", "action")},
        id="repeat_until_condition",
    ),
    pytest.param(
        {"conditions": [{"condition": "or", "conditions": [{"condition": "state", "entity_id": "person.anna"}, {"condition": "not", "conditions": [{"condition": "device", "device_id": "dev_tv", "type": "is_on"}]}]}]},
        {("person.anna", "condition"), ("device.dev_tv", "device_condition")},
        id="nested_or_not_conditions",
    ),
    pytest.param(
        {"actions": [{"choose": [{"conditions": [{"condition": "and", "conditions": [{"condition": "state", "entity_id": "sun.sun"}]}], "sequence": [_SWITCH_ON]}]}]},
        {("sun.sun", "condition"), ("switch.fan", "action")},
        id="and_condition_inside_choose",
    ),
    pytest.param(
        {"actions": [{"if": [{"condition": "state", "entity_id": "sun.sun"}], "then": [{"choose": [{"conditions": [{"condition": "state", "entity_id": "binary_sensor.door"}], "sequence": [_SWITCH_ON]}]}]}]},
        {("sun.sun", "condition"), ("binary_sensor.door", "condition"), ("switch.fan", "action")},
        id="choose_nested_in_if_then",
    ),
]


"""GIVEN one automation entity whose raw_config uses one config shape from issue #2."""
@pytest.mark.asyncio
@pytest.mark.parametrize(("config", "expected"), _BUG_CASES)
async def test_issue_2_config_shapes_produce_exact_edges(mock_hass, config, expected):

    entity = _Entity(_ENTITY_ID, {"alias": "Hall light", **config})

    """WHEN the adapter populates the graph."""
    graph = await _populate(mock_hass, [entity])

    """THEN exactly the expected edges leave the automation, and nothing else."""
    edges = {(e.source, e.target, e.dependency_kind.value) for e in graph.edges}
    assert edges == {(_ENTITY_ID, target, kind) for target, kind in expected}


"""GIVEN a UI automation whose config id differs from its entity_id."""
@pytest.mark.asyncio
async def test_uses_entity_id_and_alias_from_entity_component(mock_hass):

    config = {"id": "1700000000000", "alias": "Hall light", "triggers": []}

    """WHEN the adapter populates the graph."""
    graph = await _populate(mock_hass, [_Entity(_ENTITY_ID, config)])

    """THEN the node uses the real entity_id and alias, and states are never read."""
    assert graph.nodes[_ENTITY_ID].title == "Hall light"
    assert "automation.1700000000000" not in graph.nodes
    mock_hass.states.async_all.assert_not_called()


"""GIVEN an entity component where one entity has no raw config."""
@pytest.mark.asyncio
async def test_skips_entities_without_raw_config(mock_hass):

    entities = [_Entity("automation.broken", None), _Entity(_ENTITY_ID, {"alias": "Hall light"})]

    """WHEN the adapter populates the graph."""
    graph = await _populate(mock_hass, entities)

    """THEN only the entity with a config is processed."""
    assert "automation.broken" not in graph.nodes
    assert _ENTITY_ID in graph.nodes


"""GIVEN an entity component that exposes no raw configs and no store."""
@pytest.mark.asyncio
async def test_falls_back_to_states_when_no_entity_has_raw_config(mock_hass):

    mock_hass.states.async_all.return_value = [_State(_ENTITY_ID, {"friendly_name": "Hall light"})]

    """WHEN the adapter populates the graph."""
    graph = await _populate(mock_hass, [_Entity(_ENTITY_ID, None)])

    """THEN it still falls back to the automation states."""
    assert _ENTITY_ID in graph.nodes
    mock_hass.states.async_all.assert_called_once_with("automation")


"""GIVEN an automation with a UI device trigger and a top-level device action."""
@pytest.mark.asyncio
async def test_device_references_raise_device_id_findings(mock_hass):

    config = {
        "alias": "Hall light",
        "triggers": [{"trigger": "device", "device_id": "dev_motion", "type": "motion"}],
        "actions": [{"device_id": "dev_light", "domain": "light", "type": "turn_on"}],
    }

    """WHEN the graph is populated and fragility is detected."""
    graph = await _populate(mock_hass, [_Entity(_ENTITY_ID, config)])
    findings = [
        f for f in detect_fragility(graph) if f.fragility_type == FragilityType.DEVICE_ID_REFERENCE
    ]

    """THEN a device_id finding is raised for each referenced device."""
    assert {(f.node_id, f.related_node_ids) for f in findings} == {
        (_ENTITY_ID, ("device.dev_motion",)),
        (_ENTITY_ID, ("device.dev_light",)),
    }
