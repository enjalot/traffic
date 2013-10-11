//prototype http://tributary.io/inlet/6914083
//map of pems http://tributary.io/inlet/6894869
//tooltips with d3.tip https://github.com/Caged/d3-tip

var strikes = [];
var afterstrikes = [];
var sensors = [
  pems402814,
  pems402816,
  //pems402817,
  pems402818,
  pems402827,
];
sensors.forEach(function(sensor) {
  sensor.forEach(function(d) {
    //convert csv fields to numbers
    d.time = new Date(+d.time);
    d.flow = +d.flow;
    d.lanes = +d.lanes;
  })
});
function filter(start, end) {
  return function(d) {
    return d.time < new Date(end) && d.time > new Date(start)
  }
}

var strikeStart = +new Date("07/01/2013")
var strikeEnd = +new Date("07/06/2013")
var occupyColor = d3.scale.linear()
  .domain([0, 0.3])
  .range(["#71CFB9", "#8426DB"])
  .interpolate(d3.interpolateHcl);
var sensorColors = d3.scale.category20();

var cw = 400;
var ch = 30;
var band = 24; //hours

var controlScale = d3.scale.linear()
.domain([strikeStart, strikeEnd])
.range([0, cw])

var HOUR = 1000 * 60 * 60
var brush = d3.svg.brush()
.x(controlScale)
.on("brush", brushah)
.extent([strikeStart, +d3.time.hour.offset(new Date(strikeStart), band)])
function brushah() {
  var offset = brush.extent()[0] - strikeStart;
  var band = brush.extent()[1] - offset - strikeStart
  offset /= HOUR
  band /= HOUR
  sums = strikes.map(function(chart) {
    chart.highlight(offset, band);
  })

  var sumscale = d3.scale.linear()
  .domain([0, d3.max(sums)])
  .range([0,200]);

  /*
  var sumbars = svg.selectAll("rect.sums").data(sums)
  sumbars.enter()
  .append("rect").classed("sums", true)
  sumbars.attr({
    x: 507,
    y: function(d,i) { return 188 + i * 104 + (i > 1 ? 40 : 0) },
    width: function(d) { return sumscale(d) },
    height: 50
  })
  console.log("sums", sums)
  */
}

var brushSvg = d3.select("#brush svg")
.attr({width: cw + 100, height: ch + 100 })
var bg = brushSvg.append("g")
.classed("control", true)
.attr("transform", "translate(" + [50, 50] + ")")
brush(bg)
bg.selectAll("rect").attr("height", ch)
bg.selectAll("*").style("visibility", "visible")



var charts = d3.select("#charts")
  .selectAll("div.chart")
  .data(sensors)
charts.enter()
  .append("div").classed("chart", true)
  .each(function(data, i) {
    var dis = d3.select(this);
    dis.style("border", "1px solid " + sensorColors(i));

    var svg = dis.append("svg")
      .attr({width: 350, height: 180 })

    var strike = plot().data(data.filter(filter(strikeStart, strikeEnd)))
    var strikeg = svg.append("g")
      .attr("transform", "translate(" + [20, 20] + ")")
    strike(strikeg)
    strikes.push(strike);


    var start = new Date(strikeStart);
    var end = new Date(strikeEnd);
    var weeks = [
      data.filter(filter( d3.time.day.offset(start, -14), d3.time.day.offset(end, -14) )),
      data.filter(filter( d3.time.day.offset(start, -7), d3.time.day.offset(end, -7) )),
      data.filter(filter( d3.time.day.offset(start, 7), d3.time.day.offset(end, 7) )),
      data.filter(filter( d3.time.day.offset(start, 14), d3.time.day.offset(end, 14) ))
    ];
    weeks.forEach(function(week) {
      var afterstrike = plot().data(week);
      var afterstrikeg = svg.append("g")
        .style("opacity", 0.25)
        .attr("transform", "translate(" + [20, 110] + ")")
      afterstrike(afterstrikeg)
      afterstrikes.push(strike);
      afterstrikeg.selectAll(".x-axis").remove()
    })
    dis.append("div").classed("afterstrike", true)
      .text("average of 2 weeks prior to and after strike")

    /*
    var afterstrike = plot().data(data.filter(filter("07/9/13", "07/13/13")))
    var afterstrikeg = exitg.append("g")
    .attr("transform", "translate(" + [20, 140] + ")")
    afterstrike(afterstrikeg)
    */
  })

brushah();


function plot() {
  //var width = tributary.sw - cx - 50;
  var width = 300
  var height = 50
  var data;
  var xscale = d3.time.scale()
  var yscale = d3.scale.linear()
  var highlight;
  function chart(g) {
    var timeExtent = d3.extent(data, function(d) { return d.time })
    timeExtent[0] = d3.time.day.floor(timeExtent[0])
    xscale
    .domain(timeExtent)
    .range([0, width])

    var xbarScale = d3.scale.ordinal()
    .domain(d3.range(data.length))
    .rangeBands([0, width], 0.213909504)


    var maxFlow = d3.max(data, function(d) { return d.flow })
    yscale
    .domain([0, maxFlow])
    .range([0, height])

    var bars = g.selectAll("rect.hour")
    .data(data)

    bars.enter()
    .append("rect").classed("hour", true)

    bars.attr({
      x: function(d,i) { return xscale(d.time) },
      y: function(d) { return yscale(maxFlow) - yscale(d.flow) },
      width: xbarScale.rangeBand(),
      height: function(d) { return yscale(d.flow) }
    })
    .style({
      fill: function(d) { return occupyColor(d.lanes) }
    })

    format = d3.time.format("%B %d %H:%M")

    var hourtip = d3.tip().attr("class", "tip").html(function(d) { return format(new Date(d.time)) + " flow " + d.flow })
    g.call(hourtip)

    bars.on("mouseover", hourtip.show)
    bars.on("mouseout", hourtip.hide)

    var tickFormat = d3.time.format("%B %d")
    var xAxis = d3.svg.axis()
    .orient("bottom")
    .tickFormat(tickFormat)
    .tickValues(d3.time.day.range(timeExtent[0], d3.time.day.offset(timeExtent[1], 1)))
    .scale(xscale)

    var xg = g.append("g")
    .call(xAxis)
    .classed("x-axis", true)
    .attr("transform", "translate(" + [0, yscale(maxFlow)] + ")")
    .selectAll(".tick text")
    .attr("transform", "rotate(45)translate(17,-5)")

    highlight = g.append("rect").classed("highlight", true)
    .attr({height: height})
  }
  chart.data = function(_) {
    if(!arguments.length) return data;
    data = _;
    return chart;
  }
  chart.highlight = function(offset, band) {
    var start = d3.time.hour.offset(data[0].time, offset)
    var end = d3.time.hour.offset(data[0].time, offset + band);
    highlight.attr({
      x: xscale(start),
      width: xscale(end) - xscale(start)
    })
    var filtered = data.filter(filter(start, end));
    return d3.sum(filtered, function(d) { return d.flow })
  }
  return chart;
}
