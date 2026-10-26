"""Base adapter interface for source adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Mapping
from typing import Any

from homeassistant.core import HomeAssistant

from ..models import DependencyGraph


class SourceAdapter(ABC):
    """Base class for all source adapters."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the adapter."""
        self.hass = hass

    @abstractmethod
    async def async_populate(self, graph: DependencyGraph) -> None:
        """Populate the graph with nodes and edges from this source."""

    def _entity_raw_configs(self, domain: str) -> list[tuple[str, dict[str, Any]]]:
        """Get (entity_id, raw_config) pairs from the domain's entity component."""
        entities = getattr(self.hass.data.get(domain), "entities", None)

        if entities is None:
            return []

        configured_entities = [
            entity
            for entity in entities
            if isinstance(getattr(entity, "raw_config", None), Mapping)
        ]
        entity_configs = [
            (entity.entity_id, dict(entity.raw_config)) for entity in configured_entities
        ]

        return entity_configs
