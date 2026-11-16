/* Detailed, illustrative exterior using the PDF footprint. No map service required. */
function renderLibraryExterior() {
    const cutaway = document.getElementById("building-cutaway").checked;
    const height = (cutaway ? selectedFloor : 4) * 27;
    const yaw = Number(rotationControl.value) * Math.PI / 180;
    const tilt = Number(tiltControl.value) * Math.PI / 180;
    const zoom = Number(zoomControl.value) / 100;
    const root = document.createDocumentFragment();
    function raw([x, y, z = 0]) {
        x -= 320; y -= 190;
        return [x * Math.cos(yaw) - y * Math.sin(yaw), (x * Math.sin(yaw) + y * Math.cos(yaw)) * Math.cos(tilt) - z * Math.sin(tilt)];
    }
    const ground = [[15,-25],[640,-25],[640,490],[15,490]];
    const bounds = [...ground.map(p => raw(p)), ...outline.map(p => raw([...p,120]))];
    const minX = Math.min(...bounds.map(p=>p[0])), maxX = Math.max(...bounds.map(p=>p[0]));
    const minY = Math.min(...bounds.map(p=>p[1])), maxY = Math.max(...bounds.map(p=>p[1]));
    const scale = Math.min(550/(maxX-minX),440/(maxY-minY))*zoom;
    function project(p) { const v=raw(p); return [310+(v[0]-(minX+maxX)/2)*scale,260+(v[1]-(minY+maxY)/2)*scale]; }
    function poly(points, fill, attrs={}) {
        return svgElement("polygon", {points:points.map(p=>project(p).join(",")).join(" "),fill,stroke:"#6b7168","stroke-width":.45,...attrs});
    }
    function line(points, color, width=1) {
        return svgElement("polyline",{points:points.map(p=>project(p).join(",")).join(" "),fill:"none",stroke:color,"stroke-width":width,"pointer-events":"none"});
    }
    function depth(p) {return (p[0]-320)*Math.sin(yaw)+(p[1]-190)*Math.cos(yaw);}
    root.appendChild(poly(ground,"#9ba78b",{stroke:"#76856b"}));
    // Paving and planted strips give the model a map-like setting.
    root.appendChild(poly([[28,363],[452,363],[452,393],[28,393]],"#d2cdbd",{stroke:"none"}));
    root.appendChild(poly([[17,-13],[640,-13],[640,9],[17,9]],"#ccc9ba",{stroke:"none"}));
    root.appendChild(poly([[611,0],[637,0],[637,367],[611,367]],"#d2cdbd",{stroke:"none"}));
    // South entrance and spreading forecourt, located from the supplied aerial reference.
    const forecourt = [[298,339],[356,339],[356,382],[389,406],[430,431],[458,490],[56,490],[85,456],[137,437],[211,423],[276,402],[298,385]];
    root.appendChild(poly(forecourt,"#c9c5b6",{stroke:"#b3af9f","stroke-width":.7}));
    root.appendChild(poly([[86,455],[142,438],[220,425],[272,408],[252,433],[187,451],[122,471]],"#7f936c",{stroke:"none"}));
    root.appendChild(poly([[365,393],[399,416],[427,448],[439,480],[395,475],[384,437]],"#7f936c",{stroke:"none"}));
    for(let y=430;y<=480;y+=16)root.appendChild(line([[275,y,0],[365,y,0]],"#b1ae9e",.6));
    root.appendChild(poly(outline.map(p=>[p[0]+24,p[1]+19,0]),"#465343",{opacity:.28,stroke:"none"}));
    // Each visible facade is split into clickable storeys with inset glazing.
    const edges=outline.map((a,i)=>({a,b:outline[(i+1)%outline.length],index:i})).filter(({a,b})=>(b[1]-a[1])*Math.sin(yaw)-(b[0]-a[0])*Math.cos(yaw)>0);
    edges.sort((a,b)=>depth([(a.a[0]+a.b[0])/2,(a.a[1]+a.b[1])/2])-depth([(b.a[0]+b.b[0])/2,(b.a[1]+b.b[1])/2]));
    for(const {a,b,index} of edges) {
        const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        const along=(t,z)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,z];
        const shade=Math.abs((b[0]-a[0])/length);
        const wingName=getEdgeWing(index);
        const wingTitle=wingName[0].toUpperCase()+wingName.slice(1);
        for(let floor=1;floor<=(cutaway?selectedFloor:4);floor++) {
            const low=(floor-1)*27,high=floor*27;
            const secOcc=getWingOccupancy(floor,wingName)??getLevelOccupancy(floor);
            const tier=resolveOccupancyTier(secOcc);
            const palette=getOccupancyPalette(secOcc);
            const summary=formatOccupancySummary(secOcc);
            const isSelectedStorey=floor===selectedFloor;
            const isSelectedWingStorey=isSelectedStorey&&selectedWing===wingName;
            const wall=poly([along(0,low),along(1,low),along(1,high),along(0,high)],shade>.6?palette.wallDark:palette.wallLight,{class:`exterior-storey tier-${tier}${isSelectedStorey?' selected-storey':''}${isSelectedWingStorey?' selected-wing-storey':''}`,tabindex:0,role:"button","aria-label":`Explore Level ${floor}, ${wingName} wing: ${summary}`,"data-key":`exterior-${index}-${floor}`});
            wall.appendChild(svgElement("title",{},`Level ${floor} · ${wingTitle} Wing: ${summary}`));
            activate(wall,()=>{selectedFloor=floor;selectedWing=wingName;document.getElementById("building-cutaway").checked=true;renderFloor();});
            root.appendChild(wall);
            root.appendChild(line([along(0,high-2),along(1,high-2)],"#766e60",1));
            const windows=Math.floor(length/19);
            for(let w=0;w<windows;w++) {
                const t0=(w+.18)/windows,t1=(w+.82)/windows;
                const glass=poly([along(t0,low+7),along(t1,low+7),along(t1,high-5),along(t0,high-5)],(w+floor)%3===0?palette.glassLight:palette.glassDark,{stroke:palette.glassStroke,"stroke-width":.6,"pointer-events":"none"});
                root.appendChild(glass);
                root.appendChild(line([along((t0+t1)/2,low+7),along((t0+t1)/2,high-5)],"#c0c9c3",.45));
            }
        }
    }
    const roof=outline.map(p=>[...p,height]);
    root.appendChild(poly(roof,cutaway?"#c7c0a9":"#92968c",{stroke:"#d7dacd","stroke-width":1.5}));
    root.appendChild(line([...roof,roof[0]],cutaway?"#f2db76":"#e5e7d9",2));
    function within(p,points) {
        let inside=false;
        for(let i=0,j=points.length-1;i<points.length;j=i++) {
            const a=points[i],b=points[j];
            if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
        }
        return inside;
    }
    for(const [name,wing] of Object.entries(wingGeometry)) {
        const secOcc=getWingOccupancy(selectedFloor,name);
        const tier=resolveOccupancyTier(secOcc);
        const palette=getOccupancyPalette(secOcc);
        const summary=formatOccupancySummary(secOcc);
        const isSelectedWing=selectedWing===name;
        const surfaceFill=isSelectedWing?palette.roofWingSelected:(cutaway?palette.roofWingCutaway:palette.roofWing);
        const surfaceAttrs={class:`exterior-roof-wing tier-${tier}`,tabindex:0,role:"button","aria-label":`${name} wing, Level ${selectedFloor}: ${summary}`,"aria-pressed":String(isSelectedWing),"data-key":`roof-${name}`};
        if(isSelectedWing){surfaceAttrs.stroke="#ffec77";surfaceAttrs["stroke-width"]=2;}
        const surface=poly(wing.points.map(p=>[...p,height+.4]),surfaceFill,surfaceAttrs);
        surface.appendChild(svgElement("title",{},`Level ${selectedFloor} · ${name[0].toUpperCase()+name.slice(1)} Wing: ${summary}`));
        activate(surface,()=>{selectedWing=selectedWing===name?null:name;renderFloor();});
        root.appendChild(surface);
        if(cutaway) {
            // The Level 2 north wing is staff space, not open shelving.
            const staffArea = selectedFloor === 2 && name === "north";
            // Symbolic shelf and desk rows, clipped to each wing footprint.
            for(let x=85;x<570;x+=24)for(let y=55;y<335;y+=32) {
                const corners=[[x,y],[x+13,y],[x+13,y+19],[x,y+19]];
                if(!staffArea && corners.every(p=>within(p,wing.points))) {
                    root.appendChild(poly(corners.map(p=>[...p,height+1]),palette.furnitureFill,{"pointer-events":"none",stroke:palette.furnitureStroke}));
                    root.appendChild(line([[x+6,y,height+1],[x+6,y+19,height+1]],palette.furnitureStroke,.5));
                }
            }
        } else {
            // Roof seams and glass rooflights are stylistic, not a surveyed roof layout.
            for(let x=90;x<570;x+=32) {
                const a=[x,wing.center[1]-22],b=[x,wing.center[1]+22];
                if(within(a,wing.points)&&within(b,wing.points))root.appendChild(line([[...a,height+1],[...b,height+1]],"#7c8378",.65));
            }
            const cx=wing.center[0],cy=wing.center[1];
            const glass=[[cx-20,cy-11],[cx+20,cy-11],[cx+20,cy+11],[cx-20,cy+11]];
            if(glass.every(p=>within(p,wing.points))) {
                root.appendChild(poly(glass.map(p=>[...p,height+2]),"#708f92",{stroke:"#c5d2ce","pointer-events":"none"}));
                for(let t=-10;t<=10;t+=10)root.appendChild(line([[cx+t,cy-11,height+2],[cx+t,cy+11,height+2]],"#b4c9c6",.7));
            }
        }
        const label=project([...wing.center,height+4]);
        root.appendChild(svgElement("text",{x:label[0],y:label[1]-7,class:"exterior-wing-label"},name.toUpperCase()));
        if(secOcc) {
            const subLabel=tier==="unavailable"?"STAFF / N/A":`${Math.round(secOcc.usedPercentage)}% · ${(secOcc.usage??palette.label).toUpperCase()}`;
            const subAttrs={x:label[0],y:label[1]+5,class:`exterior-wing-sub tier-${tier}`};
            if(palette.subTextColor)subAttrs.fill=palette.subTextColor;
            root.appendChild(svgElement("text",subAttrs,subLabel));
        }
    }
    // Glazed central connector, a recognizable landmark when orbiting the model.
    root.appendChild(poly([[310,165,height+1],[355,165,height+1],[355,200,height+1],[310,200,height+1]],"#658c91",{stroke:"#bfd4cd","pointer-events":"none"}));
    for(let x=318;x<355;x+=9)root.appendChild(line([[x,165,height+1],[x,200,height+1]],"#bfd4cd",.7));
    // The door is on the south facade of the south wing, not beside the west wing.
    // Render the projecting entrance after the building only when that facade faces us.
    if (Math.cos(yaw) > 0 && height >= 54) {
        const entranceGroup=svgElement("g",{class:"main-entrance",tabindex:0,role:"button","aria-label":"Main entrance, Level 2. Explore the entrance floor.","data-key":"main-entrance"});
        const add=(points,fill,attrs={})=>entranceGroup.appendChild(poly(points,fill,{"pointer-events":"none",...attrs}));
        // Broad approach connects the forecourt to the Level 2 doorway.
        add([[306,339,27],[350,339,27],[350,418,0],[306,418,0]],"#bcb8a9",{stroke:"#dcd8ca"});
        entranceGroup.appendChild(line([[306,339,30],[306,418,3]],"#969c95",1.1));
        entranceGroup.appendChild(line([[350,339,30],[350,418,3]],"#969c95",1.1));
        // Glazed entrance porch and the slim projecting canopy seen from above.
        add([[306,339,27],[306,369,27],[306,369,50],[306,339,50]],"#64818a",{stroke:"#c6d0c9"});
        add([[306,369,27],[350,369,27],[350,369,50],[306,369,50]],"#456b77",{stroke:"#d4d8cd"});
        add([[350,369,27],[350,339,27],[350,339,50],[350,369,50]],"#78939b",{stroke:"#c6d0c9"});
        entranceGroup.appendChild(line([[328,369,27],[328,369,50]],"#d9dfd3",1));
        entranceGroup.appendChild(line([[306,369,44],[350,369,44]],"#d9dfd3",.8));
        add([[301,336,52],[355,336,52],[355,374,52],[301,374,52]],"#bec2b6",{stroke:"#e0e4d7","stroke-width":1});
        add([[301,374,49],[355,374,49],[355,374,52],[301,374,52]],"#7e897f");
        const marker=project([328,394,32]);
        entranceGroup.appendChild(svgElement("circle",{cx:marker[0],cy:marker[1]-9,r:9,fill:"#f2ca49",stroke:"#fff2be","stroke-width":1.5}));
        entranceGroup.appendChild(svgElement("text",{x:marker[0],y:marker[1]-5,class:"entrance-arrow"},"↓"));
        activate(entranceGroup,()=>{selectedFloor=2;selectedWing="south";document.getElementById("building-cutaway").checked=true;renderFloor();});
        root.appendChild(entranceGroup);
    }
    const entrance=project([328,443,0]);
    root.appendChild(svgElement("text",{x:entrance[0],y:entrance[1]+14,class:"exterior-site-label"},"MAIN ENTRANCE · LEVEL 2"));
    const trees=[[46,40],[41,105],[32,174],[39,232],[485,345],[526,312],[568,271],[591,211]];
    for(const [x,y] of trees) {
        const base=project([x,y,0]),top=project([x,y,19]);
        root.appendChild(svgElement("ellipse",{cx:base[0]+4,cy:base[1]+3,rx:10*scale,ry:4*scale,fill:"#46523b",opacity:.3}));
        root.appendChild(svgElement("line",{x1:base[0],y1:base[1],x2:top[0],y2:top[1],stroke:"#70654d","stroke-width":3*scale}));
        root.appendChild(svgElement("circle",{cx:top[0],cy:top[1],r:11*scale,fill:"#59734c",stroke:"#748b60","stroke-width":2*scale}));
        root.appendChild(svgElement("circle",{cx:top[0]-3*scale,cy:top[1]-3*scale,r:6*scale,fill:"#789363"}));
    }
    const focusKey=model.contains(document.activeElement)?document.activeElement.dataset.key:null;
    model.replaceChildren(root);
    if(focusKey)model.querySelector(`[data-key="${focusKey}"]`)?.focus({preventScroll:true});
    model.setAttribute("aria-label",`${cutaway?'Cutaway to Level '+selectedFloor:'Whole library exterior'}. Select a storey or wing. Drag to rotate.`);
}
