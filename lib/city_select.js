d3.dsv(',', 'data/worldcities_data.csv').then(function(citiesData) {
    const cities = citiesData.map(city => city.City_Country);
    $('#city').autocomplete({
        minLength: 2,
        source: cities
    })
});