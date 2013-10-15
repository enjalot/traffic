//prototype http://tributary.io/inlet/6914083
//map of pems http://tributary.io/inlet/6894869
//tooltips with d3.tip https://github.com/Caged/d3-tip

var strikes = [];
var afterstrikes = [];
var sensors = [
  pems402818,
  pems402816,
  //pems402817,
  pems402827,
  pems402814,
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
timeFormat = d3.time.format("%B %d %I%p")
numFormat = d3.format("3n")


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
  var extent = brush.extent();
  var offset = extent[0] - strikeStart;
  var band = extent[1] - offset - strikeStart
  offset /= HOUR
  band /= HOUR
  var sums = strikes.map(function(chart) {
    return chart.highlight(offset, band);
  })
  var avgflows = afterstrikes.map(function(weeks) {
    return d3.sum(weeks, function(week) {
      var start = d3.time.hour.offset(week[0].time, offset)
      var end = d3.time.hour.offset(week[0].time, offset + band);
      var filtered = week.filter(filter(start, end));
      return d3.sum(filtered, function(d) { return d.flow })
    }) / weeks.length
  })
  var avglanes = afterstrikes.map(function(weeks) {
    return d3.sum(weeks, function(week) {
      var start = d3.time.hour.offset(week[0].time, offset)
      var end = d3.time.hour.offset(week[0].time, offset + band);
      var filtered = week.filter(filter(start, end));
      return d3.sum(filtered, function(d) { return d.lanes}) / filtered.length
    }) / weeks.length
  })


  var tFormat = d3.time.format("%B %d, %I%p")
  d3.select(".dates").html(tFormat(new Date(extent[0])).toLowerCase() + " <br> " + tFormat(new Date(extent[1])).toLowerCase())
  d3.select(".hours").html(Math.floor(band))

  var charts = d3.selectAll("div.chart");
  charts.each(function(d,i) {
    var sumscale = d3.scale.linear()
      .domain([0, d3.max([sums[i].flow, avgflows[i]])])
      .range([0,80]);
    var rscale = d3.scale.sqrt()
      .domain([0, d3.max([sums[i].flow, avgflows[i]])])
      .range([5,15]);

    var sumColor = d3.scale.linear()
      .domain([0, 0.2])
      .range(occupyColor.range())
      .interpolate(d3.interpolateHcl);

    var sumbar = d3.select(this).select("svg")
      .selectAll("rect.sumbar").data([sums[i]])
    sumbar.enter()
      .append("rect").classed("sumbar", true)
    sumbar
    .attr({
      x: 290,
      y: 30,
      width: sumscale(sums[i].flow),
      height: 40
    }).style("fill", sumColor(sums[i].lanes))

    var sumtip = d3.tip().attr("class", "tip").html(function(d) {
        var str = ""
        str += " flow " + numFormat(d.flow);
        str += " <br>occupancy " + numFormat(Math.floor(d.lanes * 10000) / 10000);
        return str
      })
    sumbar.on("mouseover", sumtip.show)
    sumbar.on("mouseout", sumtip.hide)
    sumbar.call(sumtip)


    var avgsumbar = d3.select(this).select("svg")
      .selectAll("rect.avgsumbar").data([avgflows[i]])
    avgsumbar.enter()
      .append("rect").classed("avgsumbar", true)
    avgsumbar
    .attr({
      x: 290,
      y: 120,
      width: sumscale(avgflows[i]),
      height: 40
    }).style("fill", sumColor(avglanes[i]))

    var avgsumtip = d3.tip().attr("class", "tip").html(function(d) {
        var str = ""
        str += " flow " + numFormat(avgflows[i]);
        str += " <br>occupancy " + numFormat(Math.floor(avglanes[i] * 10000) / 10000);
        return str
      })
    avgsumbar.on("mouseover", avgsumtip.show)
    avgsumbar.on("mouseout", avgsumtip.hide)
    avgsumbar.call(avgsumtip)


    d3.selectAll("circle.pems")
      .filter(function(d,j) { return i == j })
      .attr({
        r: rscale(sums[i].flow),
        fill: sumColor(sums[i].lanes)
      })
  })
}

//generate the brush
var brushSvg = d3.select("#brush svg")
.attr({width: cw + 100, height: ch + 50 })
var bg = brushSvg.append("g")
.classed("control", true)
.attr("transform", "translate(" + [50, 20] + ")")
brush(bg)
bg.selectAll("rect").attr("height", ch)
bg.selectAll("*").style("visibility", "visible")


var charts = d3.select("#charts")
  .selectAll("div.chart")
  .data(sensors)
charts.enter()
  .append("div").classed("chart", true)
  .each(function(data, i) {
    //set up the card for each sensor
    var dis = d3.select(this);
    dis.style("border", "2px solid " + sensorColors(i));
    var svg = dis.append("svg")
      .attr({width: 400, height: 180 })

    svg.append("rect").classed("hova-week", true)
    .attr({
      width: 420, height: 50, x: -20, y: 20
    })

    //generate the plot for the week of the strike
    var strike = plot(true).data(data.filter(filter(strikeStart, strikeEnd)))
    var strikeg = svg.append("g")
      .attr("transform", "translate(" + [20, 20] + ")")
    strike(strikeg)
    strikes.push(strike);

    var afterstrikeg = svg.append("g")
      .style("opacity", 0.50)
      .attr("transform", "translate(" + [20, 110] + ")")

    afterstrikeg.append("rect").classed("hova-2", true)
      .attr({
        width: 420, height: 50, x: -20, y: 0
      })
    d3.select("a.hova-week").on("mouseover", function() {
      d3.selectAll("rect.hova-week").style("fill", "#ffff99")
    })
    .on("mouseout", function() {
      d3.selectAll("rect.hova-week").style("fill", "none")
    })

    d3.select("a.hova-2").on("mouseover", function() {
      d3.selectAll("rect.hova-2").style("fill", "#ffff99")
    })
    .on("mouseout", function() {
      d3.selectAll("rect.hova-2").style("fill", "none")
    })

    //Generate the plots for the 4 weeks surrounding the strike
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
      var weekg = afterstrikeg.append("g");
      

      afterstrike(weekg)
      afterstrikeg.selectAll(".x-axis").remove()
    })
    afterstrikes.push(weeks);
    dis.append("div").classed("afterstrike", true)
      .text("average of 2 weeks prior to and after strike")
  })

// ==================================
// MAP
// ==================================
var water = topojson.object(bayarea, bayarea.objects.bayareaGEO);
var width = 850;
var height = 300;

var lonlat = [-122.4, 37.8];
var projection = d3.geo.mercator()
  .center(lonlat)
  //.scale(77480)
  .scale(140115)
  .translate([width/2, height/2])

var path = d3.geo.path()
  .projection(projection);

var g = d3.select("#map svg")
.attr({width: width, height: height})
.append("g")

var zoom = d3.behavior.zoom()
    .translate(projection.translate())
    .scale(projection.scale())
    .on("zoom", zoomed);
function zoomed() {
  projection.translate(d3.event.translate).scale(d3.event.scale);
  g.selectAll(".water").attr("d", path(water));
  g.selectAll("circle.pems").attr({
    cx: function(d,i) {
      return projection([d.lon, d.lat])[0]
    },
    cy: function(d,i) {
      return projection([d.lon, d.lat])[1]
    }
  })
}
g.call(zoom)
  .on("mousewheel.zoom", null)
  .on("wheel.zoom", null)
  .on("scroll.zoom", null)


g.append("rect")
    .attr("class", "background")
    .attr("width", width)
    .attr("height", height);
g.append("path")
.attr("d", path(water))
.classed("water", true);

var circles = g.selectAll("circle.pems")
.data(pemslocs)
circles
.enter()
.append("circle").classed("pems", true)

circles.attr({
  cx: function(d,i) {
    return projection([d.lon, d.lat])[0]
  },
  cy: function(d,i) {
    return projection([d.lon, d.lat])[1]
  },
  "fill-opacity": 0.7,
  stroke: function(d,i) { return sensorColors(i) },
  title: function(d,i) { return d.id }
})
.on("mouseover", function(d,i) {
  d3.select(this).style("stroke-width", 3)
  var color = d3.rgb(occupyColor(i));
  d3.selectAll("div.chart")
    .filter(function(d,j) { return i == j })
    .style("background-color", "rgba(" + [color.r, color.g, color.b, 0.05] + ")")
})
.on("mouseout", function(d,i) {
  d3.select(this).style("stroke-width", 1)
  d3.selectAll("div.chart")
    .filter(function(d,j) { return i == j })
    .style("background-color", "");

})



//Call initial brush
brushah();


function plot(useTips) {
  //var width = tributary.sw - cx - 50;
  var width = 250
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

    
    if(useTips) {
      var hourtip = d3.tip().attr("class", "tip").html(function(d) {
        var str = ""
        str += timeFormat(new Date(d.time));
        str += " <br>flow " + numFormat(d.flow);
        str += " <br>occupancy " + numFormat(d.lanes);
        return str
      })
      g.call(hourtip)
      bars.on("mouseover", hourtip.show)
      bars.on("mouseout", hourtip.hide)
    }

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
    .attr({height: 140})
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
    return {
      flow: d3.sum(filtered, function(d) { return d.flow }),
      lanes: d3.sum(filtered, function(d) { return d.lanes }) / filtered.length
    }

  }
  return chart;
}
