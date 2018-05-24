// Various accessors that specify the four dimensions of data to visualize.
function x(d) { return d.totalprod; }
function y(d) { return d.priceperlb; }
function radius(d) { return d.numcol; }
function color(d) { return d.state; }
function key(d) { return d.state; }

// Chart dimensions.
let margin = { top: 19.5, right: 19.5, bottom: 19.5, left: 39.5 },
    width = 960 - margin.right,
    height = 500 - margin.top - margin.bottom;

// Various scales. These domains make assumptions of data, naturally.
let xScale = d3.scale.linear().domain([2000, 50000000]).range([0, width]),
    yScale = d3.scale.linear().domain([0, 4]).range([height, 0]),
    radiusScale = d3.scale.sqrt().domain([0, 100000]).range([0, 10]),
    colorScale = d3.scale.category10();

// The x & y axes.
let xAxis = d3.svg.axis().orient("bottom").scale(xScale).ticks(12, d3.format(",d")),
    yAxis = d3.svg.axis().scale(yScale).orient("left");

// Create the SVG container and set the origin.
let svg = d3.select("#plot").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Add the x-axis.
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);

// Add the y-axis.
svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

// Add an x-axis label.
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height - 6)
    .text("Total Production");

// Add a y-axis label.
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", 6)
    .attr("dy", ".75em")
    .attr("transform", "rotate(-90)")
    .text("Price per lb ($)");

// Add the year label; the value is set on transition.
let label = svg.append("text")
    .attr("class", "year label")
    .attr("text-anchor", "end")
    .attr("y", height - 24)
    .attr("x", width)
    .text(1998);

// Load the data.
// let url = "https://raw.githubusercontent.com/RobertLowe/nvd3/master/examples/honeyData.json";
let url = "/bubble-data";

d3.json(url, function (honeyData) {

    console.log(honeyData);

    // A bisector since many nation's data is sparsely-defined.
    let bisect = d3.bisector(function (d) { return d[0]; });

    // Add a dot per nation. Initialize the data at 1998, and set the colors.
    let dot = svg.append("g")
        .attr("class", "dots")
        .selectAll(".dot")
        .data(interpolateData(1998))
        .enter()
        .append("circle")
        .attr("class", "dot")
        .style("fill", function (d) { return colorScale(color(d)); })
        .call(position)
        .sort(order);

    // Add a title.
    dot.append("title")
        .text(function (d) { return d.name; });

    // Add an overlay for the year label.
    let box = label.node().getBBox();

    let overlay = svg.append("rect")
        .attr("class", "overlay")
        .attr("x", box.x)
        .attr("y", box.y)
        .attr("width", box.width)
        .attr("height", box.height)
        .on("mouseover", enableInteraction);

    // Start a transition that interpolates the data based on year.
    svg.transition()
        .duration(15000)
        .ease("linear")
        .tween("year", tweenYear)
        .each("end", enableInteraction);

    // Positions the dots based on data.
    function position(dot) {
        dot.attr("cx", function (d) { return xScale(x(d)); })
            .attr("cy", function (d) { return yScale(y(d)); })
            .attr("r", function (d) { return radiusScale(radius(d)); });
    }

    // Defines a sort order so that the smallest dots are drawn on top.
    function order(a, b) {
        return radius(b) - radius(a);
    }

    // After the transition finishes, you can mouseover to change the year.
    function enableInteraction() {
        let yearScale = d3.scale.linear()
            .domain([1998, 2012])
            .range([box.x + 10, box.x + box.width - 10])
            .clamp(true);

        // Cancel the current transition, if any.
        svg.transition().duration(0);

        overlay
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("mousemove", mousemove)
            .on("touchmove", mousemove);

        function mouseover() {
            label.classed("active", true);
        }

        function mouseout() {
            label.classed("active", false);
        }

        function mousemove() {
            displayYear(yearScale.invert(d3.mouse(this)[0]));
        }
    }

    // Tweens the entire chart by first tweening the year, and then the data.
    // For the interpolated data, the dots and label are redrawn.
    function tweenYear() {
        let year = d3.interpolateNumber(1998, 2012);
        return function (t) { displayYear(year(t)); };
    }

    // Updates the display to show the specified year.
    function displayYear(year) {
        dot.data(interpolateData(year), key).call(position).sort(order);
        label.text(Math.round(year));
    }

    // Interpolates the dataset for the given (fractional) year.
    function interpolateData(year) {
        return honeyData.map(function (d) {
            return {
                name: d.state,
                region: d.state,
                totalprod: interpolateValues(d.totalprod, year),
                numcol: interpolateValues(d.numcol, year),
                priceperlb: interpolateValues(d.priceperlb, year)
            };
        });
    }

    // Finds (and possibly interpolates) the value for the specified year.
    function interpolateValues(values, year) {
        let i = bisect.left(values, year, 0, values.length - 1),
            a = values[i];
        if (i > 0) {
            let b = values[i - 1],
                t = (year - a[0]) / (b[0] - a[0]);
            return a[1] * (1 - t) + b[1] * t;
        }
        return a[1];
    }
});
