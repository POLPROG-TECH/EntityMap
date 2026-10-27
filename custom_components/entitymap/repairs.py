"""Repair flows for EntityMap."""

from __future__ import annotations

from homeassistant.components.repairs import ConfirmRepairFlow, RepairsFlow
from homeassistant.core import HomeAssistant


async def async_create_fix_flow(
    hass: HomeAssistant,
    issue_id: str,
    data: dict | None,
) -> RepairsFlow:
    """Create a repair flow for an EntityMap issue."""
    # The fix is a configuration change only the user can make, so the flow just confirms.
    return ConfirmRepairFlow()
