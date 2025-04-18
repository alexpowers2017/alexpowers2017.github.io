const width = 975,
    height = 610;

const margin = {
    left: 10,
    right: 0,
    top: 90,
    bottom: 0
};

const nonContiguousCodes = ['AK', 'VI', 'HI', 'AS'];

function map(mapData, parkData) {
    /*** 
     * This function creates the initial map when the page is first opened. This map has nothing to do with our model or recommendations.
     * This method for creating the map was borrowed from Bill Mill at https://billmill.org/making_a_us_map.html 
     */

    const svg = setUpSVG('map');
    const usa = drawUSA(svg, mapData);
    const state = drawStates(svg, mapData);
    const parks = drawParks(svg, parkData);
}


function mapWithModelResults(mapData, parkData) {
    /***
     * This function uses data from our model to display the most highly recommended parks.
     */

    const svg = setUpSVG('map');
    const usa = drawUSA(svg, mapData);
    const state = drawStates(svg, mapData);
    const parks = drawParks(svg, parkData);

}


function setUpSVG(id) {
    /***
     * The viewBox is set to a constant value becase the projection we're using is designed for that viewBox size:
     * https://github.com/topojson/us-atlas#us-atlas-topojson
     */
    const svg = d3.select('#' + id)
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, 975, 610])
        .attr("style", "width: 100%; height: auto; height: intrinsic;");
    return svg;
}

function drawUSA(svg, mapData) {
    const usa = svg
        .append('g')
        .attr('id', 'nation')
        .append('path')
        .datum(topojson.feature(mapData, mapData.objects.nation))
        .attr('d', d3.geoPath());
    return usa;
}

function drawStates(svg, mapData) {
    const state = svg
        .append('g')
        .attr('id', 'states')
        .attr('stroke', '#444')
        .attr('fill', '#eee')
        .selectAll('path')
        .data(topojson.feature(mapData, mapData.objects.states).features)
        .join('path')
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('d', d3.geoPath());
    return state;
}


function createScales(w, h, parkData, margin) {

    // The main method will only work on the 48 contiguous states
    var contiguousParks = [];
    parkData.forEach(function(park) {
        if (!nonContiguousCodes.includes(park.state)) {
            contiguousParks.push(park);
        }
    });

    const longitudeMinMax = [-124, -68];
    const latitudeMinMax = [25.5, 49];

    var xBaseScale = d3.scaleLinear()
        .range([margin.left, w - margin.right])
        .domain(longitudeMinMax);

    var yBaseScale = d3.scaleLinear()
        .range([h - margin.bottom, margin.top])
        .domain(latitudeMinMax);

    var xAdjustmentScale = d3.scaleLinear()
        .range([-1, 1])
        .domain(longitudeMinMax);

    var yAdjustmentScale = d3.scaleLinear()
        .range([-1, 1])
        .domain(latitudeMinMax);

    const scales = {
        xBase: xBaseScale,
        xAdj: xAdjustmentScale,
        yBase: yBaseScale,
        yAdj: yAdjustmentScale,

        scaleLatLong: function(lat, long) {
            return {
                xBase: this.xBase(long),
                xAdj: this.xAdj(long),
                yBase: this.yBase(lat),
                yAdj: this.yAdj(lat)
            };
        }
    };

    return scales;
}


function drawParks(svg, parkData) {
    const scales = createScales(width, height, parkData, margin);
    const tooltip = d3.select('.tooltip');
    const parks = svg
        .append('g')
        .attr('id', 'parks')
        .selectAll('circle')
        .data(parkData)
        .enter()
        .append('circle')
        .attr('cx', function(d) {
            return projectParkLocations(d, scales)[0];
        })
        .attr('cy', function(d) {
            return projectParkLocations(d, scales)[1];
        })
        .attr('stroke', 'black')
        .attr('fill', 'lightblue')
        .on("mouseover", function(event, d) {
            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(d.name)
                .style("left", `${event.pageX + 15}px`)
                .style("top", `${event.pageY - 30}px`);
        })
        .on("mouseout", function() {
            tooltip.transition().duration(200).style("opacity", 0);
        })
        .on('click', function(event, d) {
            window.open(d.url, '_blank');
        });

    if (Object.keys(parkData[0]).includes('score')) {
        const rScale = d3.scaleLinear()
            .range([7, 25])
            .domain([
                d3.min(parkData, (d) => d.score),
                d3.max(parkData, (d) => d.score)
            ]);

        parks.attr('r', function(d) {
            return rScale(d.score);
        });
    } else {
        parks.attr('r', 7);
    }
}


function projectParkLocations(park, scales) {
    /*** 
     * I couldn't figure out how to work the latitudes and longitudes into the albers projection, 
     * so I'm just trying to do it myself. This function approximates the albers projection
     * just well enough to work for this map.
     ***/

    const maxAdjustment = {
        x: 70,
        y: 75
    };

    const scaledValues = scales.scaleLatLong(park.latitude, park.longitude);

    // The x adjustment will be made based on the location's distance from the center of the US.
    var xAdjMagnitude;
    if (Math.abs(scaledValues.xAdj) < 0.25) {
        xAdjMagnitude = 0;
    } else if (Math.abs(scaledValues.xAdj) < 0.5) {
        xAdjMagnitude = Math.abs(scaledValues.yAdj) * 0.5;
    } else {
        xAdjMagnitude = Math.abs(scaledValues.yAdj);
    }

    var xAdjDirection = scaledValues.xAdj < 0 === scaledValues.yAdj < 0 ? -1 : 1;

    var x = scaledValues.xBase + (xAdjMagnitude * xAdjDirection * maxAdjustment.x);

    var yAdjMagnitude = Math.abs(scaledValues.xAdj);
    var y = scaledValues.yBase - (yAdjMagnitude * maxAdjustment.y);


    // Manual tweaks because I don't know how to fix this anymore
    if (park.code === 'indu') {
        x = x + 15;
        y = y + 2;
    } else if (park.code === 'cuva') {
        x = x + 20;
        y = y + 7;
    } else if (park.code === 'shen') {
        x = x + 12;
    } else if (park.code === 'ever') {
        x = x - 10;
        y = y + 9;
    } else if (park.code === 'drto') {
        x = x + 10;
        y = y + 5;
    } else if (park.code === 'bisc') {
        x = x - 11;
    } else if (park.code === 'yell') {
        x = x - 15;
        y = y + 5;
    } else if (park.code === 'grte') {
        x = x - 12;
        y = y + 5;
    } else if (park.code === 'isro') {
        x = x + 18;
    } else if (park.code === 'grba') {
        x = x - 8;
    } else if (park.code === 'glac') {
        y = y + 7;
    } else if (park.code === 'wica') {
        x = x - 5;
    } else if (park.code === 'badl') {
        x = x + 10;
        y = y - 3;
    } else if (park.code === 'gumo') {
        y = y + 10;
    } else if (park.code === 'cave') {
        y = y + 2;
        x = x + 3;
    } else if (park.code === 'zion') {
        x = x - 3;
        y = y + 2;
    } else if (park.code === 'cany') {
        y = y + 3;
    }
    // Now manually set Alaska and Hawaii parks
    else if (park.code === 'dena') {
        x = 112;
        y = 520;
    } else if (park.code === 'gaar') {
        x = 105;
        y = 490;
    } else if (park.code === 'glba') {
        x = 165;
        y = 555;
    } else if (park.code === 'hale') {
        x = 300;
        y = 560;
    } else if (park.code === 'havo') {
        x = 322;
        y = 593;
    } else if (park.code === 'katm') {
        x = 90;
        y = 567;
    } else if (park.code === 'kefj') {
        x = 114;
        y = 552;
    } else if (park.code === 'kova') {
        x = 82;
        y = 500;
    } else if (park.code === 'lacl') {
        x = 100;
        y = 545;
    } else if (park.code === 'wrst') {
        x = 138;
        y = 540;
    }
    // Now manually set 
    else if (park.code === 'npsa') {
        x = 40;
        y = 430;
    } else if (park.code === 'viis') {
        x = 880;
        y = 580;
    }



    return [x, y];
}