"""Impact analysis engine for EntityMap."""

from __future__ import annotations

from collections import Counter

from .const import NodeType, Severity
from .fragility import detect_fragility
from .models import (
    DependencyGraph,
    FragilityFinding,
    ImpactReport,
    MigrationSuggestion,
)

MAX_RISK_SCORE = 100.0
DIRECT_DEPENDENT_POINTS = 10
DIRECT_DEPENDENT_CAP = 40
TRANSITIVE_DEPENDENT_POINTS = 3
TRANSITIVE_DEPENDENT_CAP = 30
HIGH_VALUE_DEPENDENT_POINTS = 5
DEVICE_REFERENCE_POINTS = 5
DEVICE_REFERENCE_CAP = 20

# Node type names are singular nouns; "entity" is the only one with an irregular plural.
IRREGULAR_PLURALS = {"entity": "entities"}

RISK_CRITICAL = 70
RISK_HIGH = 50
RISK_MEDIUM = 25


def analyze_impact(graph: DependencyGraph, node_id: str) -> ImpactReport:
    """Analyze the impact of removing/disabling a node."""
    if node_id not in graph.nodes:
        not_found_report = ImpactReport(
            target_node_id=node_id,
            summary=f"Node '{node_id}' not found in the dependency graph.",
            severity=Severity.INFO,
        )

        return not_found_report

    node = graph.nodes[node_id]

    direct_dependents = graph.get_dependents(node_id)
    all_affected = graph.get_transitive_dependents(node_id)

    type_counter: Counter[str] = Counter()
    for dep_id in all_affected:
        if dep_id in graph.nodes:
            type_counter[graph.nodes[dep_id].node_type.value] += 1

    risk_score = _calculate_risk_score(graph, node_id, direct_dependents, all_affected)
    severity = _risk_to_severity(risk_score)

    parts: list[str] = []
    for ntype, count in sorted(type_counter.items(), key=lambda x: -x[1]):
        label = IRREGULAR_PLURALS.get(ntype, f"{ntype}s") if count > 1 else ntype
        parts.append(f"{count} {label}")
    affected_summary = ", ".join(parts) if parts else "no objects"
    summary = f"Removing or replacing '{node.title}' may affect {affected_summary}."

    findings = _get_node_findings(graph, node_id)
    suggestions = _get_migration_suggestions(graph, node_id, node)

    report = ImpactReport(
        target_node_id=node_id,
        affected_nodes=tuple(sorted(all_affected)),
        affected_by_type=dict(type_counter),
        risk_score=risk_score,
        severity=severity,
        summary=summary,
        migration_suggestions=tuple(suggestions),
        fragility_findings=tuple(findings),
    )

    return report


def _calculate_risk_score(
    graph: DependencyGraph,
    node_id: str,
    direct_deps: set[str],
    transitive_deps: set[str],
) -> float:
    """Score the risk of removing a node, from 0 to 100.

    Direct dependents weigh more than transitive ones, automations and scripts
    among them add extra, and device_id references count as fragile. Each part
    is capped so one large factor cannot reach the maximum on its own.
    """
    score = 0.0
    score += min(len(direct_deps) * DIRECT_DEPENDENT_POINTS, DIRECT_DEPENDENT_CAP)
    score += min(len(transitive_deps) * TRANSITIVE_DEPENDENT_POINTS, TRANSITIVE_DEPENDENT_CAP)

    score += HIGH_VALUE_DEPENDENT_POINTS * sum(
        1
        for dep_id in direct_deps
        if (dep_node := graph.nodes.get(dep_id))
        and dep_node.node_type in (NodeType.AUTOMATION, NodeType.SCRIPT)
    )

    inbound = graph.get_inbound(node_id)
    device_trigger_count = sum(1 for e in inbound if "device" in e.dependency_kind.value)
    score += min(device_trigger_count * DEVICE_REFERENCE_POINTS, DEVICE_REFERENCE_CAP)

    return min(score, MAX_RISK_SCORE)


def _risk_to_severity(risk_score: float) -> Severity:
    """Convert risk score to severity level."""
    if risk_score >= RISK_CRITICAL:
        return Severity.CRITICAL

    if risk_score >= RISK_HIGH:
        return Severity.HIGH

    if risk_score >= RISK_MEDIUM:
        return Severity.MEDIUM

    if risk_score > 0:
        return Severity.LOW

    return Severity.INFO


def _get_node_findings(graph: DependencyGraph, node_id: str) -> list[FragilityFinding]:
    """Get fragility findings related to a specific node."""
    all_findings = detect_fragility(graph)
    node_findings = [
        f for f in all_findings if f.node_id == node_id or node_id in f.related_node_ids
    ]

    return node_findings


def _get_migration_suggestions(
    graph: DependencyGraph,
    node_id: str,
    node: object,
) -> list[MigrationSuggestion]:
    """Generate migration suggestions for a node."""
    from .models import GraphNode

    if not isinstance(node, GraphNode):
        return []

    inbound = graph.get_inbound(node_id)
    suggestions: list[MigrationSuggestion] = []

    device_suggestion = _suggest_device_id_references(inbound)

    if device_suggestion:
        suggestions.append(device_suggestion)

    automation_suggestion = _suggest_affected_automations(graph, inbound)

    if automation_suggestion:
        suggestions.append(automation_suggestion)

    device_entity_suggestion = _suggest_device_entity_migration(graph, node_id, node)

    if device_entity_suggestion:
        suggestions.append(device_entity_suggestion)

    return suggestions


def _suggest_device_id_references(inbound: list) -> MigrationSuggestion | None:
    """Flag fragile device_id-based references that break on re-pairing."""
    device_refs = [e for e in inbound if "device" in e.dependency_kind.value]

    if not device_refs:
        return None

    suggestion = MigrationSuggestion(
        description=(
            f"This node has {len(device_refs)} device_id-based reference(s). "
            "These will break if the device is re-paired."
        ),
        affected_items=tuple(e.source for e in device_refs),
        recommendation=(
            "Where possible, switch automations to use entity-based "
            "triggers and conditions instead of device_id references."
        ),
    )

    return suggestion


def _suggest_affected_automations(
    graph: DependencyGraph, inbound: list
) -> MigrationSuggestion | None:
    """Recommend reviewing automations that reference this node."""
    auto_deps = [
        e.source
        for e in inbound
        if graph.nodes.get(e.source) and graph.nodes[e.source].node_type == NodeType.AUTOMATION
    ]

    if not auto_deps:
        return None

    suggestion = MigrationSuggestion(
        description=(
            f"{len(auto_deps)} automation(s) reference this node. "
            "Review each before making changes."
        ),
        affected_items=tuple(auto_deps),
        recommendation=(
            "Open each automation and update entity_id references "
            "to point to the replacement entity."
        ),
    )

    return suggestion


def _suggest_device_entity_migration(
    graph: DependencyGraph, node_id: str, node
) -> MigrationSuggestion | None:
    """For devices, map their provided entities before replacement."""
    if node.node_type != NodeType.DEVICE:
        return None

    device_entities = [
        e.source
        for e in graph.get_inbound(node_id)
        if graph.nodes.get(e.source) and graph.nodes[e.source].node_type == NodeType.ENTITY
    ]

    if not device_entities:
        return None

    suggestion = MigrationSuggestion(
        description=(
            f"This device provides {len(device_entities)} entities. "
            "After replacing the device, map old entities to new ones."
        ),
        affected_items=tuple(device_entities),
        recommendation=(
            "Note down all entity IDs before removing the device. "
            "After adding the replacement, use HA's entity ID "
            "customization to restore the original entity IDs."
        ),
    )

    return suggestion
