(function() {
    // Pseudo-global variables
    var attrArray = ["Median income per household", "Mean income per household", "Population", "GDP in Thousands of Chained Dollars", "Average Monthly Unemployment"];
    console.log("attrArray: ", attrArray);

    var expressed = attrArray[0]; // Initial attribute
    console.log("expressed attribute: ", expressed);

    // Begin script when window loads
    window.onload = setMap;

    // Set up choropleth map
    function setMap() {
        // Map frame dimensions
        var width = 1000,
            height = 1000;

        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        // Create custom conic equal area projection
        var projection = d3.geoConicEqualArea()
            .parallels([33, 45])
            .scale(5500)
            .translate([-270, 780])
            .rotate([120, 0])
            .center([-10, 34]);

        // Create a path generator using the projection
        var path = d3.geoPath().projection(projection);

        // Use Promise.all to parallelize asynchronous data loading
        var promises = [];
        promises.push(d3.csv("data/Cali_County_Data.csv")); // Load attributes from CSV
        promises.push(d3.json("data/Surrounding_Cali_States_Provinces.topojson")); // Load surrounding states spatial data
        promises.push(d3.json("data/California_Counties.topojson")); // Load California counties spatial data
        Promise.all(promises).then(callback).catch(function(error) {
            console.error("Error loading data: ", error);
        });

        function callback(data) {
            var csvData = data[0],
                caliCounties = data[2],
                surrounding = data[1];

            console.log("csvData: ", csvData);
            console.log("California Counties topojson: ", caliCounties);
            console.log("Surrounding States topojson: ", surrounding);

            // Translate TopoJSONs back to GeoJSON
            var californiaCounties = topojson.feature(caliCounties, caliCounties.objects.California_Counties).features;
            var surroundingStates = topojson.feature(surrounding, surrounding.objects.Surrounding_Cali_States_Provinces).features;

            // Call functions with the loaded data
            setGraticule(map, path, surroundingStates);
            joinData(californiaCounties, csvData);
            var colorScale = makeColorScale(californiaCounties);
            setEnumerationUnits(californiaCounties, map, path, colorScale);            
        };
    };

    // Function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        // Create color scale generator
        var colorScale = d3.scaleThreshold()
            .range(colorClasses);

        // Build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i].properties[expressed]);
            //console.log("val: ", val);
            domainArray.push(val);
        };

        // Cluster data using ckmeans clustering algorithm to create natural breaks
        var clusters = ss.ckmeans(domainArray, 5);
        // Reset domain array to cluster minimums
        domainArray = clusters.map(function(d){
            return d3.min(d);
        });
        // Remove first value from domain array to create class breakpoints
        domainArray.shift();

        // Assign array of last 4 cluster minimums as domain
        colorScale.domain(domainArray);

        return colorScale;        
    };

    function setGraticule(map, path, surroundingStates) {
        // Create graticule generator
        var graticule = d3.geoGraticule()
            .step([5, 5]); // Place graticule lines every 5 degrees of longitude and latitude

        // Create graticule background
        var gratBackground = map.append("path")
            .datum(graticule.outline()) // Bind graticule background
            .attr("class", "gratBackground") // Assign class for styling
            .attr("d", path); // Project graticule



        // Create graticule lines
        var gratLines = map.selectAll(".gratLines") // Select graticule elements that will be created
            .data(graticule.lines()) // Bind graticule lines to each element to be created
            .enter() // Create an element for each datum
            .append("path") // Append each element to the SVG as a path element
            .attr("class", "gratLines") // Assign class for styling
            .attr("d", path); // Project graticule lines

        var states = map.selectAll(".states")
            .data(surroundingStates)
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "states " + d.properties.name; // Name of the name field is "name"
            })
            .attr("d", path);
    }

    function joinData(californiaCounties, csvData) {
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; // The current county
            var csvKey = csvRegion.California_County; // The CSV primary key
            //console.log("csvKey: ", csvKey);

            for (var a = 0; a < californiaCounties.length; a++) {
                var geojsonProps = californiaCounties[a].properties; // The current county geojson properties
                //console.log("geojsonProps: ", geojsonProps);
                var geojsonKey = geojsonProps.NAME_ALT; // The geojson primary key
                //console.log("geojsonKey: ", geojsonKey);

                // Where primary keys match, transfer CSV data to geojson properties object
                if (geojsonKey === csvKey) {
                    // Assign all attributes and values
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvRegion[attr]); // Get CSV attribute value
                        //console.log("Attribute: ", attr, "Value: ", val); // Log attribute and value
                        geojsonProps[attr] = val; // Assign attribute and value to geojson properties
                    });
                }
            }
        }
    };

    function setEnumerationUnits(californiaCounties, map, path, colorScale) {
        // Add California counties to map
        var counties = map.selectAll(".counties")
            .data(californiaCounties) // Pass in the reconverted GeoJSON
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "counties " + d.properties.NAME_ALT;
            })
            .attr("d", path)
            .style("fill", function(d) {
                return colorScale(d.properties[expressed]);
            });

        console.log("Converted GeoJSON features: ", californiaCounties);
    };
})();
