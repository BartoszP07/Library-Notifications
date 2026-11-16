const floors = {
    1: {
        title: "Journals & collaborative study", description: "Explore the journal collections, study areas and laptop docking spaces on Level 1.",
        items: ["900–999 · Geography, archaeology & history", "Collaborative study areas", "PC and laptop dock area"],
        wings: {
            north: ["Journals", "Browse printed and oversize journals in the north wing.", ["Printed journals", "Oversize journals", "Microfilm reader"]],
            east: ["East wing store", "The east wing holds the store and a study area beside the atrium.", ["East wing store", "Study area", "Palatine stairs"]],
            south: ["History & collaborative study", "Find the 900–999 collection and collaborative study space here.", ["Geography, archaeology & history", "Collaborative study area", "SafePod"]],
            west: ["PCs & laptop docks", "The west wing includes a bookable PC and laptop dock area.", ["PC / laptop dock area", "Disability support rooms", "Café stairs"]]
        }
    },
    2: {
        title: "The entrance floor", description: "Start here for library help, borrowing and returning books, and a coffee.",
        items: ["830–899 · Literature", "Help and information desk", "Borrow, return & print"],
        wings: {
            north: ["North wing", "The north wing is largely a staff area on this floor.", ["Staff area", "Cathedral stairs", "Central stairs"]],
            east: ["Literature & study", "Find literature, study spaces and laptop docks in the east wing.", ["830–899 · Literature", "Study area", "PC / laptop dock area"]],
            south: ["Library services", "The entrance area brings together library support and self-service facilities.", ["Help and information desk", "Borrow, return & print", "Laptop loans"]],
            west: ["Coffee & study", "The west side connects the café, study area and main stairs.", ["Small Island Coffee", "Study area", "Main and café stairs"]]
        }
    },
    3: {
        title: "Science, arts & languages", description: "Discover the largest subject range, with study areas around the collections.",
        items: ["400–699 · Languages, science & medicine", "700–829 · Arts, music & literature", "PC and laptop dock area"],
        wings: {
            north: ["Arts & study", "The north wing contains arts collections and study areas.", ["700–779 · Arts", "Study areas", "Central stairs"]],
            east: ["Music & literature", "Find music, film, sport and literature alongside study and PC areas.", ["780–829 · Music, film, sport & literature", "Study area", "PC area"]],
            south: ["Languages & science", "The south wing holds collections from languages to business, with study space around them.", ["400–699 · Languages, science & medicine", "Study area", "Main stairs"]],
            west: ["PCs & laptop docks", "Study at the PC and laptop dock area on the west side.", ["PC / laptop dock area", "Group study rooms", "Café stairs"]]
        }
    },
    4: {
        title: "Computing, law & research", description: "Find computing, social sciences and law, plus postgraduate and individual study spaces.",
        items: ["001–399 · Computing to social sciences", "Law reports", "Postgraduate study spaces"],
        wings: {
            north: ["Social sciences", "The north wing holds social science collections and study areas.", ["305.89808–339 · Social sciences", "Study areas", "Group study rooms"]],
            east: ["Law & study", "The east wing contains law reports and study spaces beside the atrium.", ["340–399 · Law & social sciences", "PC and study areas", "Palatine stairs"]],
            south: ["Computing & more", "Browse the start of the collection and find study areas along the south wing.", ["001–305.898 · Computing to social sciences", "Study area", "Main stairs"]],
            west: ["Postgraduate study", "The west wing includes postgraduate rooms and the Shincliffe PC room.", ["Postgraduate room", "Shincliffe PC room", "Café stairs"]]
        }
    }
};

const OCCUPANCY_TIERS = ["low", "normal", "high", "unavailable", "unknown"];
const OCCUPANCY_PALETTE = {
    low: {
        wallLight: "#5b9467",
        wallDark: "#44734f",
        glassLight: "#9bd1b8",
        glassDark: "#3f6d5c",
        glassStroke: "#cbe8d8",
        roofWing: "#53875f",
        roofWingCutaway: "#4e8059",
        roofWingSelected: "#72b07f",
        furnitureFill: "#355b3e",
        furnitureStroke: "#9cc9a7",
        badgeColor: "#4ade80",
        label: "Low"
    },
    normal: {
        wallLight: "#c2923d",
        wallDark: "#9c7129",
        glassLight: "#e8cf8a",
        glassDark: "#7d6233",
        glassStroke: "#f3e3b4",
        roofWing: "#b58632",
        roofWingCutaway: "#a97c2b",
        roofWingSelected: "#dfb255",
        furnitureFill: "#7d591b",
        furnitureStroke: "#ebd196",
        badgeColor: "#f59e0b",
        label: "Normal"
    },
    high: {
        wallLight: "#bd564b",
        wallDark: "#943e36",
        glassLight: "#e59c93",
        glassDark: "#733530",
        glassStroke: "#f2c5bf",
        roofWing: "#ae493f",
        roofWingCutaway: "#a24238",
        roofWingSelected: "#d86c61",
        furnitureFill: "#742c26",
        furnitureStroke: "#eba69f",
        badgeColor: "#f87171",
        label: "High"
    },
    unavailable: {
        wallLight: "#5e646a",
        wallDark: "#484d53",
        glassLight: "#8b939b",
        glassDark: "#3e444a",
        glassStroke: "#b6bcc2",
        roofWing: "#53595f",
        roofWingCutaway: "#4b5157",
        roofWingSelected: "#737b84",
        furnitureFill: "#3b4045",
        furnitureStroke: "#8d949b",
        badgeColor: "#94a3b8",
        label: "Unavailable"
    },
    unknown: {
        wallLight: "#b6a185",
        wallDark: "#a08b70",
        glassLight: "#9bbdc1",
        glassDark: "#547681",
        glassStroke: "#d2cab7",
        roofWing: "#a5aa9e",
        roofWingCutaway: "#a2b49b",
        roofWingSelected: "#e2c35a",
        furnitureFill: "#747e68",
        furnitureStroke: "#d4d7bd",
        badgeColor: "#a8a29e",
        label: "Loading"
    }
};

function getEdgeWing(edgeIndex) {
    if (edgeIndex === 0 || edgeIndex === 21) return "north";
    if (edgeIndex >= 1 && edgeIndex <= 11) return "east";
    if (edgeIndex >= 12 && edgeIndex <= 14) return "south";
    return "west";
}

function getClientUsageConfig() {
    const lowMaxEl = document.getElementById("low-max-input");
    const highMinEl = document.getElementById("high-min-input");
    const lowLabelEl = document.getElementById("low-label-input");
    const normalLabelEl = document.getElementById("normal-label-input");
    const highLabelEl = document.getElementById("high-label-input");
    return {
        lowMax: lowMaxEl ? Number(lowMaxEl.value) : 600,
        highMin: highMinEl ? Number(highMinEl.value) : 1100,
        lowLabel: (lowLabelEl?.value || "").trim() || "Low",
        normalLabel: (normalLabelEl?.value || "").trim() || "Normal",
        highLabel: (highLabelEl?.value || "").trim() || "High"
    };
}

function getLevelOccupancy(floorNum) {
    const data = typeof library_data !== "undefined" ? library_data : null;
    return data?.levels?.[`level${floorNum}`] ?? null;
}

function getWingOccupancy(floorNum, wingName) {
    if (!wingName) return null;
    return getLevelOccupancy(floorNum)?.sections?.[wingName] ?? null;
}

function resolveOccupancyTier(entry) {
    if (!entry) return "unknown";
    if (
        entry.available === false ||
        Number(entry.total) <= 0 ||
        entry.usage_tier === "unavailable" ||
        entry.usage === "Unavailable"
    ) {
        return "unavailable";
    }
    if (entry.usage_tier === "low" || entry.usage_tier === "normal" || entry.usage_tier === "high") {
        return entry.usage_tier;
    }

    const total = Number(entry.total) || 0;
    const free = Math.max(0, Number(entry.free) || 0);
    const occupiedRatio = total > 0 ? Math.max(0, total - free) / total : 0;
    const data = typeof library_data !== "undefined" ? library_data : null;
    const totalCapacity = Number(data?.total) || 0;

    if (totalCapacity > 0) {
        const cfg = getClientUsageConfig();
        const lowRatio = cfg.lowMax / totalCapacity;
        const highRatio = cfg.highMin / totalCapacity;
        if (occupiedRatio < lowRatio) return "low";
        if (occupiedRatio > highRatio) return "high";
        return "normal";
    }

    const usedPct = Number.isFinite(Number(entry.usedPercentage)) ? Number(entry.usedPercentage) : occupiedRatio * 100;
    if (usedPct < 33.3) return "low";
    if (usedPct > 61.1) return "high";
    return "normal";
}

function setTierClass(element, tier) {
    if (!element) return;
    for (const t of OCCUPANCY_TIERS) {
        element.classList.remove(`tier-${t}`);
    }
    element.classList.add(`tier-${tier}`);
}

function hslToHex(h, s, l) {
    const sn = s / 100;
    const ln = l / 100;
    const k = n => (n + h / 30) % 12;
    const a = sn * Math.min(ln, 1 - ln);
    const f = n => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = x => Math.round(x * 255).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function computeOccupancyHue(entry) {
    const total = Math.max(0, Number(entry.total) || 0);
    const free = Math.max(0, Number(entry.free) || 0);
    const usedPct = Number.isFinite(Number(entry.usedPercentage))
        ? Math.min(100, Math.max(0, Number(entry.usedPercentage)))
        : (total > 0 ? Math.min(100, Math.max(0, ((total - free) / total) * 100)) : 0);
    const ratio = usedPct / 100;

    const data = typeof library_data !== "undefined" ? library_data : null;
    const totalCapacity = Number(data?.total) || 0;
    let lowRatio = 0.333;
    let highRatio = 0.611;
    if (totalCapacity > 0) {
        const cfg = getClientUsageConfig();
        lowRatio = Math.min(0.95, Math.max(0.02, cfg.lowMax / totalCapacity));
        highRatio = Math.min(0.98, Math.max(lowRatio + 0.02, cfg.highMin / totalCapacity));
    }
    const midRatio = (lowRatio + highRatio) / 2;

    const stops = [
        [0, 142],
        [lowRatio, 96],
        [midRatio, 45],
        [highRatio, 22],
        [1, 3]
    ];

    for (let i = 0; i < stops.length - 1; i++) {
        const [r0, h0] = stops[i];
        const [r1, h1] = stops[i + 1];
        if (ratio <= r1) {
            const t = r1 > r0 ? (ratio - r0) / (r1 - r0) : 0;
            return h0 + (h1 - h0) * t;
        }
    }
    return 3;
}

function getOccupancyPalette(entry) {
    const tier = resolveOccupancyTier(entry);
    if (!entry || tier === "unknown" || tier === "unavailable") {
        const base = OCCUPANCY_PALETTE[tier];
        return {
            ...base,
            isContinuous: false,
            subTextColor: null,
            barColor: base.badgeColor
        };
    }

    const h = computeOccupancyHue(entry);
    return {
        isContinuous: true,
        wallLight: hslToHex(h, 38, 46),
        wallDark: hslToHex(h, 40, 35),
        glassLight: hslToHex(h, 48, 72),
        glassDark: hslToHex(h, 36, 33),
        glassStroke: hslToHex(h, 52, 84),
        roofWing: hslToHex(h, 40, 42),
        roofWingCutaway: hslToHex(h, 42, 38),
        roofWingSelected: hslToHex(h, 56, 56),
        furnitureFill: hslToHex(h, 45, 27),
        furnitureStroke: hslToHex(h, 50, 76),
        mapFill: hslToHex(h, 40, 24),
        mapSelectedFill: hslToHex(h, 48, 38),
        mapStroke: hslToHex(h, 58, 56),
        badgeColor: hslToHex(h, 82, 66),
        badgeBorder: hslToHex(h, 48, 36),
        badgeBg: hslToHex(h, 45, 14),
        subTextColor: hslToHex(h, 85, 82),
        barColor: hslToHex(h, 58, 48),
        label: OCCUPANCY_PALETTE[tier].label
    };
}

function formatOccupancySummary(entry) {
    if (!entry) return "Loading occupancy data";
    const tier = resolveOccupancyTier(entry);
    if (tier === "unavailable") return "Unavailable / Staff area";
    const free = Math.max(0, Number(entry.free) || 0);
    const total = Math.max(0, Number(entry.total) || 0);
    const usedPct = Number.isFinite(Number(entry.usedPercentage))
        ? entry.usedPercentage
        : (total > 0 ? Number((((total - free) / total) * 100).toFixed(1)) : 0);
    return `${free}/${total} free (${usedPct}% occupied · ${entry.usage ?? OCCUPANCY_PALETTE[tier].label})`;
}

function syncLegendLabels() {
    const cfg = getClientUsageConfig();
    const lowEl = document.getElementById("legend-low-label");
    const normalEl = document.getElementById("legend-normal-label");
    const highEl = document.getElementById("legend-high-label");
    if (lowEl) lowEl.textContent = cfg.lowLabel;
    if (normalEl) normalEl.textContent = cfg.normalLabel;
    if (highEl) highEl.textContent = cfg.highLabel;
}

function createOccupancyHeaderAndBar(titleText, entry) {
    const tier = resolveOccupancyTier(entry);
    const palette = getOccupancyPalette(entry);
    const fragment = document.createDocumentFragment();

    const header = document.createElement("div");
    header.className = "occ-card-head";
    const label = document.createElement("span");
    label.className = "occ-card-title";
    label.textContent = titleText;
    const pill = document.createElement("span");
    pill.className = `occ-card-pill tier-${tier}`;
    pill.textContent = tier === "unavailable" ? "Unavailable" : String(entry.usage ?? palette.label);
    if (palette.isContinuous) {
        pill.style.color = palette.badgeColor;
        pill.style.borderColor = palette.badgeBorder;
        pill.style.backgroundColor = palette.badgeBg;
    }
    header.append(label, pill);
    fragment.appendChild(header);

    if (tier === "unavailable") {
        const note = document.createElement("p");
        note.className = "occ-card-unavailable";
        note.textContent = "Staff / non-bookable zone — no public live seat count.";
        fragment.appendChild(note);
        return fragment;
    }

    const total = Math.max(0, Number(entry.total) || 0);
    const free = Math.max(0, Number(entry.free) || 0);
    const occupied = Math.max(0, total - free);
    const usedPct = Number.isFinite(Number(entry.usedPercentage))
        ? Math.min(100, Math.max(0, Number(entry.usedPercentage)))
        : (total > 0 ? Math.min(100, Math.round((occupied / total) * 100)) : 0);

    const track = document.createElement("div");
    track.className = "occ-card-track";
    const fill = document.createElement("div");
    fill.className = `occ-card-fill tier-${tier}`;
    fill.style.width = `${usedPct}%`;
    if (palette.isContinuous) {
        fill.style.backgroundColor = palette.barColor;
    }
    track.appendChild(fill);
    fragment.appendChild(track);

    const stats = document.createElement("div");
    stats.className = "occ-card-stats";
    const occSpan = document.createElement("span");
    occSpan.textContent = `${occupied} / ${total} occupied`;
    const freeSpan = document.createElement("span");
    freeSpan.textContent = `${free} free (${usedPct}%)`;
    stats.append(occSpan, freeSpan);
    fragment.appendChild(stats);

    return fragment;
}

function renderOccupancyCard() {
    const card = document.getElementById("floor-occupancy-card");
    if (!card) return;
    const levelOcc = getLevelOccupancy(selectedFloor);
    const wingOcc = selectedWing ? getWingOccupancy(selectedFloor, selectedWing) : null;

    if (!levelOcc && !wingOcc) {
        card.hidden = true;
        card.replaceChildren();
        return;
    }

    card.hidden = false;
    const content = document.createDocumentFragment();

    if (selectedWing && wingOcc) {
        content.appendChild(createOccupancyHeaderAndBar(`${selectedWing.toUpperCase()} WING OCCUPANCY`, wingOcc));
    } else if (levelOcc) {
        content.appendChild(createOccupancyHeaderAndBar(`LEVEL ${selectedFloor} OCCUPANCY`, levelOcc));
        const grid = document.createElement("div");
        grid.className = "wing-occ-grid";
        for (const wingName of ["north", "east", "south", "west"]) {
            const wOcc = getWingOccupancy(selectedFloor, wingName);
            const wTier = resolveOccupancyTier(wOcc);
            const wPalette = getOccupancyPalette(wOcc);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = `wing-occ-mini tier-${wTier}`;
            if (wPalette.isContinuous) {
                btn.style.borderLeftColor = wPalette.barColor;
            }
            const nameEl = document.createElement("span");
            nameEl.className = "wing-occ-name";
            nameEl.textContent = wingName.toUpperCase();
            const valEl = document.createElement("span");
            valEl.className = "wing-occ-val";
            if (!wOcc) {
                valEl.textContent = "--";
            } else if (wTier === "unavailable") {
                valEl.textContent = "N/A";
            } else {
                valEl.textContent = `${Math.round(wOcc.usedPercentage)}% · ${wOcc.free}/${wOcc.total}`;
            }
            btn.append(nameEl, valEl);
            btn.addEventListener("click", () => {
                selectedWing = wingName;
                renderFloor();
            });
            grid.appendChild(btn);
        }
        content.appendChild(grid);
    }

    card.replaceChildren(content);
}

let selectedFloor = 2;
let selectedWing = null;
const floorTabs = document.querySelectorAll(".floor-tab");

function renderFloor() {
    const floor = floors[selectedFloor];
    document.getElementById("current-floor-label").textContent = `Viewing Level ${selectedFloor}${selectedFloor === 2 ? " · Entrance" : ""}`;
    model?.setAttribute("aria-label", `Level ${selectedFloor} library model. Select a wing. Use the controls below to rotate and zoom.`);
    const wing = selectedWing && floor.wings[selectedWing];
    document.getElementById("floor-detail-kicker").textContent = `LEVEL ${selectedFloor} // ${selectedWing ? selectedWing.toUpperCase() + " WING" : "OVERVIEW"}`;
    document.getElementById("floor-detail-title").textContent = wing ? wing[0] : floor.title;
    document.getElementById("floor-detail-description").textContent = wing ? wing[1] : floor.description;
    document.getElementById("floor-list-label").textContent = wing ? "IN THIS AREA" : "ON THIS FLOOR";
    const list = document.getElementById("floor-detail-list");
    list.replaceChildren(...(wing ? wing[2] : floor.items).map(item => {
        const li = document.createElement("li");
        li.textContent = item;
        return li;
    }));
    syncLegendLabels();
    floorTabs.forEach(tab => {
        const floorNum = Number(tab.dataset.floor);
        const active = floorNum === selectedFloor;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-pressed", String(active));

        const levelOcc = getLevelOccupancy(floorNum);
        const tier = resolveOccupancyTier(levelOcc);
        const palette = getOccupancyPalette(levelOcc);
        setTierClass(tab, tier);
        if (palette.isContinuous) {
            tab.style.setProperty("--tab-accent", palette.barColor);
        } else {
            tab.style.removeProperty("--tab-accent");
        }
        let badge = tab.querySelector(".tab-occ-badge");
        if (!badge) {
            badge = document.createElement("span");
            badge.className = "tab-occ-badge";
            tab.appendChild(badge);
        }
        setTierClass(badge, tier);
        if (palette.isContinuous) {
            badge.style.color = palette.badgeColor;
            badge.style.borderColor = palette.badgeBorder;
        } else {
            badge.style.color = "";
            badge.style.borderColor = "";
        }
        badge.textContent = levelOcc
            ? (tier === "unavailable" ? "N/A" : `${Math.round(levelOcc.usedPercentage)}%`)
            : "--";
    });
    renderOccupancyCard();
    if (typeof renderBuilding === "function") renderBuilding();

}

floorTabs.forEach(tab => tab.addEventListener("click", () => {
    selectedFloor = Number(tab.dataset.floor);
    selectedWing = null;
    renderFloor();
}));
// Initialize after the 3D controls and geometry are ready.

// Orthographic projection keeps the model lightweight and usable without WebGL.
const model = document.getElementById("building-map");
const rotationControl = document.getElementById("map-rotation");
const tiltControl = document.getElementById("map-tilt");
const zoomControl = document.getElementById("map-zoom");
const outline = [[185,35],[415,35],[438,20],[470,35],[493,20],[523,35],[548,23],[574,42],[601,90],[575,126],[540,155],[493,175],[420,190],[420,292],[378,339],[245,339],[245,355],[65,355],[65,265],[150,265],[150,205],[185,170]];
const wingGeometry = {
    north: { points: [[195,45],[408,45],[408,164],[195,164]], center: [302,104] },
    east: { points: [[420,48],[439,33],[470,47],[493,33],[523,47],[547,36],[565,50],[586,90],[565,116],[540,144],[485,161],[420,175]], center: [498,95] },
    south: { points: [[257,205],[405,205],[405,287],[372,325],[257,325]], center: [331,265] },
    west: { points: [[77,275],[160,275],[160,211],[187,184],[244,184],[244,343],[77,343]], center: [165,287] }
};
const svgNS = "http://www.w3.org/2000/svg";
function svgElement(tag, attributes, text) {
    const element = document.createElementNS(svgNS, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    if (text) element.textContent = text;
    return element;
}

function renderBuilding() {
    if (model) renderLibraryExterior();
}
function activate(element, action) {
    element.addEventListener("click", () => { if (!suppressModelClick) action(); });
    element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); action(); }
    });
}
function selectModelFloor(level) {
    selectedFloor = level;
    selectedWing = null;
    renderFloor();
}
let suppressModelClick = false;
let drag = null;
model.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    drag = {x: event.clientX, angle: Number(rotationControl.value), moved: false};
    suppressModelClick = false;
});
model.addEventListener("pointermove", event => {
    if (!drag) return;
    const delta = event.clientX - drag.x;
    if (Math.abs(delta) > 5) {
        drag.moved = true;
        suppressModelClick = true;
        model.setPointerCapture(event.pointerId);
        rotationControl.value = String(Math.max(-180, Math.min(180, drag.angle + delta * .6)));
        renderBuilding();
    }
});
function endDrag() { drag = null; }
window.addEventListener("pointerup", endDrag);
model.addEventListener("pointerup", endDrag);
model.addEventListener("pointercancel", endDrag);
model.addEventListener("lostpointercapture", endDrag);
[rotationControl, tiltControl, zoomControl].forEach(control => control.addEventListener("input", renderBuilding));
document.getElementById("reset-map").addEventListener("click", () => {
    rotationControl.value = "-25"; tiltControl.value = "55"; zoomControl.value = "100";
    renderBuilding();
});
document.getElementById("building-cutaway").addEventListener("change", renderBuilding);

renderFloor();
