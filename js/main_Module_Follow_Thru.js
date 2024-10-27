var myDiv =  document.getElementById("mydiv");
myDiv.innerHTML = "Hello World";

//initialize function called when the script loads
function initialize(){
    cityPop();
};

//Me practicing the code for using one array of objects instead of two arrays.
var cityPop = [
    {
        city: 'Madison',
        population: 233209
    },
    {
        city: 'Milwaukee',
        population: 594833
    },
    {
        city: 'Green Bay',
        population: 104057
    },
    {
        city: 'Superior',
        population: 27244
    }
];

console.log(cityPop[2])
/*trying single array method

//function to create a table with cities and their populations
function cities(){
    var cities = [
        'Madison',
        'Milwaukee',
        'Green Bay',
        'Superior'
    ];
    var population = [
        233209,
        594833,
        104057,
        27244
    ];
end of trying single array method */
    //create an HTML table element
    var table = document.createElement("table");

    //create a header row
    var headerRow = document.createElement("tr");


/*
These items here are using javascript language to write html language that creates the header row AND populates it with the string 
at the end of the .innerHTML method.  It writes that string to the innerHTML element! Which is a thing, perhaps a node.
*/
    //add the "City" column
    var cityHeader = document.createElement("th");
    cityHeader.innerHTML = "City";
    headerRow.appendChild(cityHeader);

    //add the "Population" column
    var popHeader = document.createElement("th");
    popHeader.innerHTML = "Population";
    headerRow.appendChild(popHeader);

    //add the row to the table
    table.appendChild(headerRow);

    //loop to add a new row for each city
    for (var i = 0; i < cityPop.length; i++){
        var tr = document.createElement("tr");

        var city = document.createElement("td");
        city.innerHTML = cityPop[i];
        tr.appendChild(city);

        var pop = document.createElement("td");
        pop.innerHTML = population[i];
        tr.appendChild(pop);

        table.appendChild(tr);
    };

    //add the table to the div in index.html
    var myDiv =  document.getElementById("mydiv");
    myDiv.appendChild(table);


//call the initialize function when the window has loaded
window.onload = initialize();