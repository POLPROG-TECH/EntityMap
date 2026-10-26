"""Tests for EntityMap summary sensors.

Scenarios cover the reported values (including the cached fragility findings),
the restore bridge used before the first scan, and the scan status attributes
exposed on the last_scan sensor.
"""

from __future__ import annotations

from datetime import UTC, datetime

from custom_components.entitymap.const import (
    DependencyKind,
    FragilityType,
    NodeType,
    Severity,
)
from custom_components.entitymap.graph import GraphBuilder
from custom_components.entitymap.models import FragilityFinding, GraphEdge, GraphNode
from custom_components.entitymap.sensor import SENSOR_DESCRIPTIONS, EntityMapSensor


def _sensor(key, entry, builder):
    """Build the summary sensor for the given description key."""
    description = next(d for d in SENSOR_DESCRIPTIONS if d.key == key)

    return EntityMapSensor(entry, description, builder)


def _scanned_builder(mock_hass, mock_config_entry):
    """A builder that has completed a scan with two nodes and one edge."""
    builder = GraphBuilder(mock_hass, mock_config_entry)
    builder.graph.add_node(GraphNode("light.a", NodeType.ENTITY, "A"))
    builder.graph.add_node(GraphNode("automation.b", NodeType.AUTOMATION, "B"))
    builder.graph.add_edge(GraphEdge("automation.b", "light.a", DependencyKind.ACTION))
    builder.last_scan = datetime(2026, 6, 15, tzinfo=UTC)

    return builder


class TestSensorValues:
    """Scenarios for the value each sensor reports after a scan."""

    """GIVEN a builder with a scanned graph."""
    def test_total_nodes_and_edges_use_graph_counts(self, mock_hass, mock_config_entry):

        builder = _scanned_builder(mock_hass, mock_config_entry)

        """WHEN the node and edge sensors are read."""
        total_nodes = _sensor("total_nodes", mock_config_entry, builder).native_value
        total_edges = _sensor("total_edges", mock_config_entry, builder).native_value

        """THEN they report the graph counts."""
        assert total_nodes == 2
        assert total_edges == 1

    """GIVEN a builder whose findings were cached by the last scan."""
    def test_fragility_sensor_uses_cached_findings(self, mock_hass, mock_config_entry):

        builder = _scanned_builder(mock_hass, mock_config_entry)
        builder.findings = [
            FragilityFinding(
                finding_id="f1",
                fragility_type=FragilityType.MISSING_ENTITY,
                severity=Severity.HIGH,
                node_id="automation.b",
            ),
            FragilityFinding(
                finding_id="f2",
                fragility_type=FragilityType.DEVICE_ID_REFERENCE,
                severity=Severity.MEDIUM,
                node_id="automation.b",
            ),
        ]

        """WHEN the fragility sensor is read."""
        issues = _sensor("fragility_issues", mock_config_entry, builder).native_value

        """THEN it returns the cached count without recomputing."""
        assert issues == 2

    """GIVEN a builder that has scanned."""
    def test_last_scan_returns_timestamp(self, mock_hass, mock_config_entry):

        builder = _scanned_builder(mock_hass, mock_config_entry)

        """WHEN the last_scan sensor is read."""
        last_scan = _sensor("last_scan", mock_config_entry, builder).native_value

        """THEN it returns the scan timestamp."""
        assert last_scan == builder.last_scan


class TestRestoreBridge:
    """Scenarios for the value reported before the first scan of a session."""

    """GIVEN a builder that has not scanned yet and a restored value."""
    def test_restored_value_used_until_first_scan(self, mock_hass, mock_config_entry):

        builder = GraphBuilder(mock_hass, mock_config_entry)
        sensor = _sensor("total_nodes", mock_config_entry, builder)
        sensor._restored_native_value = 42
        assert builder.last_scan is None

        """WHEN the sensor is read."""
        value = sensor.native_value

        """THEN it returns the restored value instead of an empty graph count."""
        assert value == 42

    """GIVEN a restored value but a scan that has since completed."""
    def test_live_value_used_after_scan(self, mock_hass, mock_config_entry):

        builder = _scanned_builder(mock_hass, mock_config_entry)
        sensor = _sensor("total_nodes", mock_config_entry, builder)
        sensor._restored_native_value = 42

        """WHEN the sensor is read."""
        value = sensor.native_value

        """THEN it returns the live graph count, not the stale restored value."""
        assert value == 2


class TestScanStatusAttributes:
    """Scenarios for the diagnostics exposed on the last_scan sensor."""

    """GIVEN a builder with a recorded scan status."""
    def test_last_scan_exposes_status_duration_and_errors(self, mock_hass, mock_config_entry):

        builder = _scanned_builder(mock_hass, mock_config_entry)
        builder.last_scan_status = "errors"
        builder.last_scan_duration = 1.25
        builder.adapter_error_count = 2

        """WHEN the last_scan attributes are read."""
        attrs = _sensor("last_scan", mock_config_entry, builder).extra_state_attributes

        """THEN status, duration, and adapter error count are exposed."""
        assert attrs["status"] == "errors"
        assert attrs["duration_seconds"] == 1.25
        assert attrs["adapter_errors"] == 2
