(function() {
    
    // Pseudo-global variables
    var attrArray = ["Median income per household", "Mean income per household", "Population", "GDP in Thousands of Chained Dollars", "Average Monthly Unemployment"];
    console.log("attrArray: ", attrArray);

    var expressed = attrArray[0]; // Initial attribute
    console.log("expressed attribute: ", expressed);

    var chart, chartInnerWidth, chartInnerHeight, yScale;

    // Begin script when window loads
    window.onload = setMap;

    function setMap() {
        console.log("Running setMap")
        // Map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 800;
    
        var svg = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);
    
        var map = svg.append("g");
    
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
            console.log("Running callBack")
            var csvData = data[0],
                caliCounties = data[2],
                surrounding = data[1];
    
            console.log("csvData: ", csvData);
            console.log("California Counties topojson: ", caliCounties);
            console.log("Surrounding States topojson: ", surrounding);
    
            // Translate TopoJSONs back to GeoJSON
            var californiaCounties = topojson.feature(caliCounties, caliCounties.objects.California_Counties).features;
            console.log("Converted GeoJSON features: ", californiaCounties);
            var surroundingStates = topojson.feature(surrounding, surrounding.objects.Surrounding_Cali_States_Provinces).features;
    
            // Call functions with the loaded data
            joinData(californiaCounties, csvData);
            setGraticule(map, path, surroundingStates);
            var colorScale = makeColorScale(csvData);
            setEnumerationUnits(californiaCounties, map, path, colorScale);
            
            // Add coordinated visualization to the map
            setChart(csvData, colorScale, expressed);
    
            // Attach the function to the counties with path as an argument
            map.selectAll(".counties")
                .data(californiaCounties)
                .enter().append("path")
                .attr("class", "counties")
                .attr("d", path);  
                
            createDropdown(csvData);
        }; //end of callback
    }; //end of setMap

    function joinData(californiaCounties, csvData) {
        console.log("Running joinData")
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; // The current county
            var csvKey = csvRegion.California_County; // The CSV primary key

            for (var a = 0; a < californiaCounties.length; a++) {
                var geojsonProps = californiaCounties[a].properties; // The current county geojson properties
                var geojsonKey = geojsonProps.NAME_ALT; // The geojson primary key

                // Where primary keys match, transfer CSV data to geojson properties object
                if (geojsonKey == csvKey) {
                    // Assign all attributes and values
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvRegion[attr]); // Get CSV attribute value
                        geojsonProps[attr] = val; // Assign attribute and value to geojson properties
                    });
                }
                //console.log("geojsonProps: ",geojsonProps);
            }
        }
    };

    function setGraticule(map, path, surroundingStates) {
        console.log("Running setGraticule")
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
    };

    // Function to create color scale generator
    function makeColorScale(data){
        console.log("Running makeColorScale")
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
        //console.log("expressed value at domainArray creation: ", expressed);
        //console.log("data from within the colorScale function: ", data);
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            //console.log("val: ", val);
            domainArray.push(val);
        };
        console.log("domainArray", domainArray);

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

    function setEnumerationUnits(californiaCounties, map, path, colorScale){
        console.log("Running setEnumerationUnits")
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
            })
        console.log("Converted GeoJSON features: ", californiaCounties);
    };

    // Function to create coordinated bar chart
    function setChart(csvData, colorScale, expressed){

        console.log("Running setChart")
        
        // Remove any existing chart
        d3.selectAll(".chart").remove();
        
        // Chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 500,
            leftPadding = 50,  // Increased left padding
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        // Create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        // Create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)  // Match chartBackground height to chartInnerHeight
            .attr("transform", translate);

        // Create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 20])  // Adjusted range to match inner height
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed]); })]);

        // Set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b) {
                return a[expressed] - b[expressed];
            })
            .attr("class", function(d) {
                return "bar " + d.ALT_NAME;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)  // Adjusted width calculation
            .attr("x", function(d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));  // Adjusted height calculation
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed])) + 5;  // Adjusted y position
            })
            .style("fill", function(d) {
                return colorScale(d[expressed]);
            });

        // Create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 100)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(expressed);

        // Create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale)
            .tickFormat(d3.format(".0f"));  // Format ticks as integers

        // Place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        // Create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        console.log("Running createDropdown")
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){return d})
            .text(function(d){ return d });
    };//end of createDropdown

    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        console.log("Running changeAttribute");
        // Change the expressed attribute
        expressed = attribute;
        console.log("Expressed attribute changed to: ", expressed);
    
        // Recreate the color scale
        var colorScale = makeColorScale(csvData);
    
        // Recolor enumeration units
        d3.selectAll(".counties")
            .transition()
            .duration(1000)
            .style("fill", function(d) {
                var value = d.properties[expressed];
                return value ? colorScale(value) : "#ccc";
            });
    
        // Update the bars with transitions
        var chart = d3.select(".chart");
        var chartInnerWidth = window.innerWidth * 0.425 - 50 - 2;
        var chartInnerHeight = 500 - 5 * 2;
        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 20])
            .domain([0, d3.max(csvData, function(d) { return parseFloat(d[expressed]); })]);
    
        updateBars(chart, csvData, colorScale, expressed, chartInnerWidth, chartInnerHeight, 50, yScale);
    } //end of changeAttribute

    function updateBars(chart, csvData, colorScale, expressed, chartInnerWidth, chartInnerHeight, leftPadding, yScale) {
        console.log("Running updateBars");
    
        // Sort the data based on the expressed attribute
        csvData.sort(function(a, b) {
            return parseFloat(a[expressed]) - parseFloat(b[expressed]);
        });
    
        // Bind data to bars
        var bars = chart.selectAll(".bar")
            .data(csvData);
    
        // Enter selection: create new bars
        bars.enter()
            .append("rect")
            .attr("class", function(d) {
                return "bar " + d.ALT_NAME;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed])) + 5;
            })
            .style("fill", function(d) {
                return colorScale(d[expressed]);
            });
    
        // Update selection: update existing bars
        bars.transition()
            .delay(function(d, i) {
                return i * 20;  // Delay each bar by 20ms
            })
            .duration(500)  // 0.5 second duration
            .attr("x", function(d, i) {  // Update x position based on sorted data
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d) {
                return yScale(parseFloat(d[expressed])) + 5;
            })
            .style("fill", function(d) {
                return colorScale(d[expressed]);
            });
    
        // Exit selection: remove bars that are no longer needed
        bars.exit().remove();
    }
})();