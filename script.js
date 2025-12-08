
const width = 960;
const height = 600;
const years = [2009, 2011, 2013, 2015, 2017, 2019, 2021];


let geoData;
let wasteData;
let currentYear = 2009;


const svg = d3.select("#map")
    .attr("width", width)
    .attr("height", height);


const projection = d3.geoConicConformal()
    .center([2.454071, 46.279229])
    .scale(2800);

const path = d3.geoPath().projection(projection);


const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolateYlOrRd);


const tooltip = d3.select("#tooltip");


Promise.all([
    d3.json("departements-version-simplifiee.geojson"),
    d3.csv("mesDonnes.csv")
]).then(function([json, csvData]) {

    
    const cleanData = csvData.filter(row => row.L_TYP_REG_DECHET === "DEEE");

    console.log(`Loaded ${cleanData.length} rows of DEEE waste data`);

    
    geoData = json;

    
    for (let j = 0; j < geoData.features.length; j++) {
        const departement = geoData.features[j];
        const codeDept = departement.properties.code;

        
        const deptData = {};
        cleanData.forEach(row => {
            
            const csvDeptCode = row.C_DEPT;

            if (csvDeptCode === codeDept) {
                const year = row.ANNEE;
                
                const tonnageStr = row.TONNAGE_T.replace(',', '.');
                const tonnage = parseFloat(tonnageStr) || 0;
                deptData[year] = tonnage;
            }
        });

        
        geoData.features[j].properties.wasteData = deptData;
    }

    
    updateColorScale(currentYear);

    
    drawMap(currentYear);

    
    setupSlider();

}).catch(function(error) {
    console.error("Error loading data:", error);
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("fill", "red")
        .text("Erreur de chargement des données. Vérifiez les fichiers CSV et GeoJSON.");
});


function updateColorScale(year) {
    const values = geoData.features
        .map(d => d.properties.wasteData[year])
        .filter(v => v !== undefined && !isNaN(v));

    const minValue = d3.min(values) || 0;
    const maxValue = d3.max(values) || 20000;

    colorScale.domain([minValue, maxValue]);

    
    
    updateLegend(minValue, maxValue);
}


function drawMap(year) {
    currentYear = year;


    d3.select("#year-display").text(year);


    updateColorScale(year);


    const departments = svg.selectAll("path")
        .data(geoData.features);


    departments.join("path")
        .attr("class", "department")
        .attr("d", path)
        .style("fill", function(d) {
            const value = d.properties.wasteData[year];
            if (value === undefined || isNaN(value)) {
                return "#cccccc"; 
            }
            return colorScale(value);
        })
        .on("mouseover", function(event, d) {
            const value = d.properties.wasteData[year];
            const deptName = d.properties.nom || d.properties.name || "Inconnu";

            tooltip.classed("visible", true)
                .html(`
                    <div class="tooltip-title">${deptName}</div>
                    <div class="tooltip-value">
                        ${value !== undefined && !isNaN(value)
                            ? `${value.toLocaleString('fr-FR')} tonnes`
                            : 'Données non disponibles'}
                    </div>
                    <div class="tooltip-value">Année: ${year}</div>
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.classed("visible", false);
        });
}


function updateLegend(minValue, maxValue) {
    const legendScale = d3.select("#legend-scale");
    legendScale.html(""); 

    const steps = 5;
    const step = (maxValue - minValue) / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const value = minValue + (step * i);
        const color = colorScale(value);

        const item = legendScale.append("div")
            .attr("class", "legend-item");

        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", color);

        item.append("div")
            .attr("class", "legend-label")
            .text(Math.round(value).toLocaleString('fr-FR'));
    }
}


function setupSlider() {
    d3.select("#slider").on("input", function() {
        const sliderValue = parseInt(this.value);
        const selectedYear = years[sliderValue];
        drawMap(selectedYear);
    });
}
