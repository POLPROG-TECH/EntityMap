"""Tests for the EntityMap custom panel serving.

The panel is a multi-file ES module served from a static directory. These
scenarios guard that the module exists, that the frontend directory is
registered as a static path, that the sidebar panel points at the served
module (regression for issue #1, where the panel could not load), and that D3
is loaded from the bundled copy rather than a CDN (regression for issue #2,
where the graph did not render without internet access).
"""

from __future__ import annotations

import hashlib
import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.setup import async_setup_component

from custom_components.entitymap import _async_register_panel
from custom_components.entitymap.panel import (
    FRONTEND_DIR,
    PANEL_MODULE_URL,
    PANEL_URL_BASE,
    async_register_frontend,
)

VENDORED_D3 = FRONTEND_DIR / "vendor" / "d3.min.js"
VENDORED_D3_LICENSE = FRONTEND_DIR / "vendor" / "d3.LICENSE.txt"
# sha256 of dist/d3.min.js from the d3@7.9.0 npm tarball (npm integrity
# sha512-e1U46jVP+w7Iut8Jt8ri1YsPOvFpg46k+K8TpCb0P+zjCkjkPnV7WzfDJzMHy1LnA+wj5pLT1wjO901gLXeEhA==).
VENDORED_D3_SHA256 = "f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539"
REMOTE_SCRIPT_HOSTS = ("jsdelivr", "unpkg", "cdnjs", "d3js.org")


def _references_remote_host(source: str) -> bool:
    """Return whether a module source mentions a known remote script host."""
    return any(host in source for host in REMOTE_SCRIPT_HOSTS)


async def _register_and_capture() -> dict:
    """Register the sidebar panel and return the kwargs sent to the frontend."""
    captured: dict = {}

    with patch(
        "homeassistant.components.frontend.async_register_built_in_panel",
        side_effect=lambda _hass, **kwargs: captured.update(kwargs),
    ):
        await _async_register_panel(MagicMock())

    return captured


class TestFrontendAssets:
    """Scenarios for the served frontend module."""

    """GIVEN the static frontend directory."""
    def test_panel_module_exists_in_frontend_dir(self):

        """WHEN it is inspected."""
        panel_module = FRONTEND_DIR / "entitymap-panel.js"

        """THEN it contains the panel module the sidebar points at."""
        assert panel_module.is_file()

    """GIVEN the advertised module URL."""
    def test_module_url_is_under_the_static_base(self):

        """WHEN it is compared to the static base."""
        prefix = f"{PANEL_URL_BASE}/"

        """THEN it is served from that base as a .js module."""
        assert PANEL_MODULE_URL.startswith(prefix)
        assert PANEL_MODULE_URL.endswith(".js")


class TestVendoredD3:
    """Scenarios for the bundled D3 library (offline support)."""

    """GIVEN the vendored D3 bundle."""
    def test_vendored_d3_is_the_pinned_release(self):

        """WHEN its contents are hashed."""
        content = VENDORED_D3.read_bytes()

        """THEN it is the unmodified d3 v7.9.0 release build."""
        assert content.startswith(b"// https://d3js.org v7.9.0 ")
        assert hashlib.sha256(content).hexdigest() == VENDORED_D3_SHA256

    """GIVEN the vendored D3 bundle."""
    def test_vendored_d3_ships_its_licence(self):

        """WHEN the licence file next to it is read."""
        notice = VENDORED_D3_LICENSE.read_text(encoding="utf-8")

        """THEN it holds the ISC notice D3 requires."""
        assert "Copyright 2010-2023 Mike Bostock" in notice
        assert "Permission to use, copy, modify, and/or distribute" in notice

    """GIVEN the panel constants module."""
    def test_panel_loads_d3_from_the_bundled_copy(self):

        """WHEN its source is read."""
        constants = (FRONTEND_DIR / "shared" / "constants.js").read_text(encoding="utf-8")

        """THEN the D3 script URL resolves to the vendored file next to the module."""
        assert re.search(
            r'D3_SCRIPT_URL = new URL\("\.\./vendor/d3\.min\.js", import\.meta\.url\)',
            constants,
        )

    """GIVEN the hand-written panel modules."""
    def test_no_panel_module_references_a_remote_script_host(self):

        modules = [p for p in FRONTEND_DIR.rglob("*.js") if "vendor" not in p.parts]

        """WHEN their sources are scanned for CDN hosts."""
        offenders = [
            module.name
            for module in modules
            if _references_remote_host(module.read_text(encoding="utf-8"))
        ]

        """THEN none of them loads code from a CDN."""
        assert modules
        assert offenders == []


class TestStaticRegistration:
    """Scenarios for registering the frontend static path."""

    """GIVEN a Home Assistant instance."""
    @pytest.mark.asyncio
    async def test_registers_frontend_directory(self):

        hass = MagicMock()
        hass.http.async_register_static_paths = AsyncMock()

        """WHEN the frontend is registered."""
        await async_register_frontend(hass)

        """THEN the frontend directory is served at the panel base path."""
        configs = hass.http.async_register_static_paths.call_args.args[0]
        assert len(configs) == 1
        assert configs[0].url_path == PANEL_URL_BASE
        assert configs[0].path == str(FRONTEND_DIR)


class TestPanelRegistration:
    """Scenarios for registering the sidebar panel."""

    """GIVEN a Home Assistant instance."""
    @pytest.mark.asyncio
    async def test_registers_non_admin_custom_panel(self):

        """WHEN the panel is registered."""
        captured = await _register_and_capture()

        """THEN it is a non-admin custom panel pointing at the served module."""
        assert captured["component_name"] == "custom"
        assert captured["frontend_url_path"] == "entitymap"
        assert captured["require_admin"] is False
        assert captured["config"]["_panel_custom"]["embed_iframe"] is False
        assert captured["config"]["_panel_custom"]["module_url"] == PANEL_MODULE_URL


class TestServedBundle:
    """Scenarios for Home Assistant serving the bundled D3 over HTTP."""

    """GIVEN a real Home Assistant HTTP server with the frontend registered."""
    @pytest.mark.asyncio
    async def test_home_assistant_serves_d3_without_auth(self, hass, hass_client_no_auth):

        assert await async_setup_component(hass, "http", {})
        await async_register_frontend(hass)
        client = await hass_client_no_auth()

        """WHEN an unauthenticated client fetches D3 and the module that points at it."""
        d3_response = await client.get(f"{PANEL_URL_BASE}/vendor/d3.min.js")
        constants_response = await client.get(f"{PANEL_URL_BASE}/shared/constants.js")

        """THEN Home Assistant itself serves the unmodified bundle, with no internet needed."""
        assert d3_response.status == 200
        assert "javascript" in d3_response.content_type
        assert hashlib.sha256(await d3_response.read()).hexdigest() == VENDORED_D3_SHA256
        assert constants_response.status == 200
        assert 'new URL("../vendor/d3.min.js", import.meta.url)' in await constants_response.text()
