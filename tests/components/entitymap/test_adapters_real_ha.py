"""Integration tests for issue #2 against real Home Assistant components.

The real automation and script integrations are set up, so a full EntityMap
scan reads configs exactly as current Home Assistant exposes them: as entity
components whose state attributes carry no triggers, conditions or actions.
"""

from __future__ import annotations

import pytest
from homeassistant.setup import async_setup_component

from custom_components.entitymap.const import FragilityType
from custom_components.entitymap.graph import GraphBuilder

_AUTOMATIONS = [
    {
        "id": "1700000000001",
        "alias": "Hall light",
        "triggers": [{"trigger": "state", "entity_id": "binary_sensor.motion", "to": "on"}],
        "conditions": [{"condition": "state", "entity_id": "input_boolean.home", "state": "on"}],
        "actions": [
            {
                "choose": [
                    {
                        "conditions": [{"condition": "state", "entity_id": "sun.sun", "state": "below_horizon"}],
                        "sequence": [{"action": "light.turn_on", "target": {"entity_id": "light.hall"}}],
                    }
                ]
            },
            {
                "if": [{"condition": "state", "entity_id": "binary_sensor.door", "state": "on"}],
                "then": [{"action": "switch.turn_on", "target": {"entity_id": "switch.fan"}}],
            },
            {
                "repeat": {
                    "while": [{"condition": "state", "entity_id": "binary_sensor.motion", "state": "on"}],
                    "sequence": [{"delay": 1}],
                }
            },
        ],
    },
    {
        "id": "1700000000002",
        "alias": "Motion device",
        "triggers": [{"trigger": "device", "device_id": "dev_motion", "domain": "binary_sensor", "type": "motion"}],
        "actions": [{"device_id": "dev_light", "domain": "light", "type": "turn_on", "entity_id": "4c1f0e2a9b"}],
    },
]

_SCRIPTS = {
    "night_mode": {
        "alias": "Night mode",
        "sequence": [
            {"action": "lock.lock", "target": {"entity_id": "lock.front"}},
            {"device_id": "dev_lock", "domain": "lock", "type": "lock", "entity_id": "a1b2c3"},
        ],
    }
}

_EXPECTED_EDGES = {
    ("automation.hall_light", "binary_sensor.motion", "trigger"),
    ("automation.hall_light", "input_boolean.home", "condition"),
    ("automation.hall_light", "sun.sun", "condition"),
    ("automation.hall_light", "light.hall", "action"),
    ("automation.hall_light", "binary_sensor.door", "condition"),
    ("automation.hall_light", "switch.fan", "action"),
    ("automation.hall_light", "binary_sensor.motion", "condition"),
    ("automation.motion_device", "device.dev_motion", "device_trigger"),
    ("automation.motion_device", "device.dev_light", "device_action"),
    ("script.night_mode", "lock.front", "action"),
    ("script.night_mode", "device.dev_lock", "device_action"),
}


async def _load_automations_and_scripts(hass) -> None:
    """Load the automations and scripts through the real HA components."""
    assert await async_setup_component(hass, "automation", {"automation": _AUTOMATIONS})
    assert await async_setup_component(hass, "script", {"script": _SCRIPTS})
    await hass.async_block_till_done()


"""GIVEN an automation loaded by the real automation component."""
@pytest.mark.asyncio
async def test_state_attributes_hold_no_automation_config(hass):

    assert await async_setup_component(hass, "automation", {"automation": _AUTOMATIONS[:1]})
    await hass.async_block_till_done()

    """WHEN its state attributes are read."""
    attributes = hass.states.get("automation.hall_light").attributes

    """THEN they carry no triggers, conditions or actions, so a state fallback cannot link it."""
    assert not {"trigger", "triggers", "condition", "conditions", "action", "actions"} & set(attributes)
    assert not hasattr(hass.data["automation"], "async_items")


"""GIVEN UI-style automations and a script with nested conditions and device references."""
@pytest.mark.asyncio
async def test_full_scan_links_automations_and_scripts(hass, mock_config_entry):

    await _load_automations_and_scripts(hass)
    builder = GraphBuilder(hass, mock_config_entry)

    """WHEN EntityMap runs a full scan."""
    await builder.async_build()

    """THEN every automation and script is linked to exactly what its config uses."""
    sources = {"automation.hall_light", "automation.motion_device", "script.night_mode"}
    edges = {
        (e.source, e.target, e.dependency_kind.value)
        for e in builder.graph.edges
        if e.source in sources
    }
    assert edges == _EXPECTED_EDGES
    assert builder.graph.nodes["automation.hall_light"].title == "Hall light"
    assert builder.adapter_error_count == 0


"""GIVEN an automation and a script that reference devices by device_id."""
@pytest.mark.asyncio
async def test_full_scan_reports_device_id_findings(hass, mock_config_entry):

    await _load_automations_and_scripts(hass)
    builder = GraphBuilder(hass, mock_config_entry)

    """WHEN EntityMap runs a full scan."""
    await builder.async_build()

    """THEN a device_id finding is reported for each device reference."""
    findings = {
        (f.node_id, f.related_node_ids)
        for f in builder.findings
        if f.fragility_type == FragilityType.DEVICE_ID_REFERENCE
    }
    assert findings == {
        ("automation.motion_device", ("device.dev_motion",)),
        ("automation.motion_device", ("device.dev_light",)),
        ("script.night_mode", ("device.dev_lock",)),
    }
