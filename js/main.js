//begin script when window loads
window.onload = setMap();

//set up chloropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/Cali_County_Data.csv"),
                    d3.json("data/EuropeCountries.topojson"),
                    d3.json("data/California_Counties.topojson")
                    ];
    Promise.all(promise).then(callback);

    function callback(data) {
        var csvData = data[0],
            europe = data[1],
            france = data[2];
        console.log(csvData);
        console.log(europe);
        console.log(france);
    }
};