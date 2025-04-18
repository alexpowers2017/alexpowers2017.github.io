// Global variable to save the main dataset to 
let fullData = [];

// Object to go back and forth between the names for fields in the data vs. what we call them in the table
const tableHeaderMap = {
    name: 'Park Name',
    state: 'State',
    description: 'Description',
    score: 'Overall Score',
    reviewScore: 'Review Score',
    wikipediaScore: 'Wikipedia Score',
    crowdScore: 'Crowd Score',
    distanceMiles: 'Distance (mi)'
};


// Load in the initial map first thing once the page loads
window.addEventListener('DOMContentLoaded', async(event) => {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json`);
    const mapJson = await res.json();
    var parkJson = await d3.json('data/park_info.json');
    //citiesData = await d3.dsv(',', 'data/worldcities_data.csv');
    //cities = citiesData.map(city => city.City_Country);
    map(mapJson, parkJson);
});

function joinParksData(jsonData, modelResults) {
    /* Takes the park data from our json file and performs an inner join with the results of the model */
    var joinedData = [];
    modelResults.forEach(function(modelResult) {
        var jsonEntry = jsonData.filter(park => park.code === modelResult.code)[0];
        var mergedObj = {...modelResult, ...jsonEntry };
        joinedData.push(mergedObj);
    });
    return joinedData;
}

async function handleSubmit(event) {
    event.preventDefault();

    // Read inputs from page and assemble request
    let inputsObj = readInputs();
    let requestUrl = 'https://national-park-recommender-prototype-290892703713.us-central1.run.app';
    let requestObj = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(inputsObj)
    };

    // Start the spinner and turn the submit button gray
    document.getElementById('loading-wheel').style.display = 'inline-block';
    document.getElementById('submit-button').style.backgroundColor = 'lightgray';

    // Send request and pull park data from json file
    const [response, parkJson, res] = await Promise.all([
        fetch(requestUrl, requestObj),
        d3.json('data/park_info.json'),
        fetch(`https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json`)
    ]);
    const modelResponse = await response.json();
    const mapJson = await res.json();
    fullData = joinParksData(parkJson, modelResponse.data);

    console.log(modelResponse);
    // Delete and recreate the map, displaying the results of the model
    d3.select('#map').selectAll('*').remove();
    mapWithModelResults(mapJson, fullData);

    // Delete and recreate the table
    d3.select('#table-container').selectAll('*').remove();
    createTable(fullData);

    // Stop the spinner and turn the button blue again
    document.getElementById('loading-wheel').style.display = 'none';
    document.getElementById('submit-button').style.backgroundColor = '#0056b3';
}


function readInputs() {
    /* Reads everything from the form and returns all of the values as a single object */
    let prompt = document.getElementById("prompt").value;
    let month = document.getElementById("month").value;
    let crowdPreference = document.querySelector('input[name="crowd"]:checked').value;
    let city = document.getElementById('city').value;

    inputsObj = {
        prompt: prompt,
        month: month,
        crowdPreference: crowdPreference,
        city: city
    };

    return inputsObj;
}

function getScaleForVariable(joinedData, key) {
    const lightColor = '#F0F8FF';
    const darkColor = '#318CE7';
    const scale = d3.scaleLinear()
        .range([lightColor, darkColor])
        .domain([
            d3.min(joinedData, (d) => d[key]),
            d3.max(joinedData, (d) => d[key])
        ]);
    return scale;
}

function isNumber(value) {
    return typeof value === 'number' && !isNaN(parseFloat(value))
}


function sortData(data, sortKey) {
    let copy = [...data];
    copy.sort((a, b) => {
        if (isNumber(a[sortKey]) && isNumber(b[sortKey])) {
            return b[sortKey] - a[sortKey];
        } else {
            return a[sortKey].localeCompare(b[sortKey]);
        }
    });
    return copy;
}



function createTable(joinedData, sortKey = 'score') {
    const sortedData = sortData(joinedData, sortKey);

    // Scales to color the metric cells according to their values
    const scales = {
        score: getScaleForVariable(sortedData, 'score'),
        reviewScore: getScaleForVariable(sortedData, 'reviewScore'),
        wikipediaScore: getScaleForVariable(sortedData, 'wikipediaScore'),
        crowdScore: getScaleForVariable(sortedData, 'crowdScore')
    };

    const container = document.getElementById("table-container");

    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    Object.entries(tableHeaderMap).forEach(([key, value]) => {
        const th = document.createElement('th');
        th.innerHTML = key === sortKey ? `${value} &darr;` : value;
        th.onclick = () => sortTable(value);
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    sortedData.forEach(item => {
        const row = document.createElement('tr');
        Object.keys(tableHeaderMap).forEach(key => {
            const td = document.createElement('td');
            if (isNumber(item[key])) {
                td.textContent = Math.round(item[key] * 100) / 100;
            } else {
                td.textContent = item[key];
            }
            if (['score', 'reviewScore', 'wikipediaScore', 'crowdScore'].includes(key)) {
                td.style.backgroundColor = scales[key](item[key]);
                td.style.textAlign = 'center';
            }
            row.appendChild(td);
        });
        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    document.getElementById('legend').style.visibility = 'visible';
}

function refreshTable(joinedData, sortKey) {
    d3.select('#table-container').selectAll('*').remove();
    createTable(joinedData, sortKey);
}

function sortTable(columnName) {
    let sortKey;
    Object.entries(tableHeaderMap).forEach(([key, value]) => {
        if (value === columnName) {
            sortKey = key;
        }
    });
    refreshTable(fullData, sortKey);
}