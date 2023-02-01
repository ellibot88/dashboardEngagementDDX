//console.log(domo.env)
// DDX Bricks Wiki - See https://developer.domo.com/docs/ddx-bricks
// for tips on getting started, linking to Domo data and debugging your app

//Step 1. Select your data from the link in the bottom left corner

//Step 2. Style your chart using the following properties
//--------------------------------------------------
// Properties
//--------------------------------------------------
const exclude = document.getElementById("exclude");
const welcome = document.getElementById("welcome");
const excludeLabel = document.getElementById("exclude-label");
domo
  .post(
    `/sql/v1/${datasets[1]}`,
    `SELECT "Object_ID", "Object_Name" FROM ${datasets[1]} WHERE "Object_ID" = ${domo.env.pageId}`,
    { contentType: "text/plain" }
  )
  .then(function handleResult(data) {
    console.log(data);
    welcome.insertAdjacentText("beforeend", ` ${data.rows[0][1]}`);
    welcome.insertAdjacentText("beforeend", ` Page (Last 30 days)`);
  });

var maxItemsBeforeOther = 12;
var valueFormat = "Number"; //"Number", "Currency"
var valDecimalPlaces = "Default"; //"None", ".0", ".00", ".000", ".0000", ".00000"
var legendValue = "Default"; //"Value", "Percentage", "Label Only", "Value and Percentage"
var hideLegend = false;
var chartMargin = 20; //space to leave around chart (in pixels)
var enableFiltering = true; //set to false to disable page filtering (cardbus)

//--------------------------------------------------
// For ultimate flexibility, modify the code below!
//--------------------------------------------------

//Available globals
var domo = window.domo;
var datasets = window.datasets;
var DomoPhoenix = window.DomoPhoenix;
var chartContainer = document.getElementById("myDiv"); //get "myDiv" from the html tab

//Data Column Names
var dataNameColumnName = "Name";
var dataValueColumnName = "Views - Last 30 Days";

//Form the data query
var fields = [dataNameColumnName, dataValueColumnName];
var groupby = [dataNameColumnName];
var query = `/data/v1/${
  datasets[1]
}?fields=${fields.join()}&groupby=${groupby.join()}`;

//Get the data and chart it
domo
  .post(
    `/sql/v1/${datasets[1]}`,
    `SELECT DATE("Event_Time"), COUNT("User_ID") FROM ${datasets[1]} WHERE "Object_ID" = ${domo.env.pageId} GROUP BY DATE("EVENT_TIME")`,
    { contentType: "text/plain" }
  )
  .then(function handleResult(data) {
    console.log(data);
    chartIt(data);
  });

//domo.get(query, {format: 'array-of-arrays'}).then(function(data) {
//console.log(data)
//chartIt(data);
//})

var chart;
var cardBus = new CardBus();
function chartIt(data) {
  // Read more about data types and mappings here: https://domoapps.github.io/domo-phoenix/#/domo-phoenix/api
  var columns = [
    {
      type: DomoPhoenix.DATA_TYPE.STRING,
      name: data.columns[0],
      mapping: DomoPhoenix.MAPPING.ITEM,
    },
    {
      type: DomoPhoenix.DATA_TYPE.LONG,
      name: data.columns[1],
      mapping: DomoPhoenix.MAPPING.VALUE,
    },
  ];

  var propertyOverrides = {
    max_before_other: maxItemsBeforeOther,
    value_format: valueFormat,
    val_decimal_places: valDecimalPlaces,
    legend_value: legendValue,
    hide_legend: hideLegend,
    symbol_on_last: true,
    single_value_type: "SUM",
    hide_change_value: true,
    line_thickness: "Thick",
    no_data_message: "No Views in the past 30 Days",
  };

  // Set your "Chart Options": https://domoapps.github.io/domo-phoenix/#/domo-phoenix/api
  var size = getChartSize();
  var options = {
    width: size.width * 0.95,
    height: size.height * 0.8,
    properties: propertyOverrides,
  };

  // Create the Phoenix Chart
  var phoenixData = { columns: columns, rows: data.rows };
  chart = new DomoPhoenix.Chart(
    DomoPhoenix.CHART_TYPE.SPARK_LINE,
    phoenixData,
    options
  );

  // Append the canvas element to your div
  chartContainer.appendChild(chart.canvas);
  chartContainer.style.margin = chartMargin + "px " + chartMargin + "px 0";

  // Handle click events
  enableFiltering && cardBus.addChart(chart);

  // Render the chart when you're ready for the user to see it

  domo
    .post(
      `/sql/v1/${datasets[0]}`,
      `SELECT "Security Profile", "User ID" FROM ${datasets[0]} WHERE "User ID" = ${domo.env.userId}`,
      { contentType: "text/plain" }
    )
    .then(function handleResult(data) {
      if (data.rows[0][0] == "Admin") {
        exclude.style.visibility = "visible";
        excludeLabel.style.visibility = "visible";
        welcome.style.visibility = "visible";
        chart.render();
      }
    });
}

function getChartSize() {
  return {
    width: window.innerWidth - chartMargin * 2,
    height: window.innerHeight - chartMargin * 2,
  };
}

window.addEventListener &&
  window.addEventListener("resize", function () {
    var size = getChartSize();
    chart && chart.resize(size.width, size.height);
  });

function CardBus() {
  var charts = [];

  function triggerBus(srcChart, ev) {
    charts.forEach((chart) => {
      if (srcChart == chart) {
        var isHighlightEvent = ev.highlight !== undefined;
        var isDrillEvent = ev.applyfilters !== undefined;
        if (isHighlightEvent) {
          var filters = ev.highlight;
          chart.highlight(filters);
        }
        if (isDrillEvent) {
          var filters = ev.applyfilters;
          console && console.log("Drill event", filters);
          if (filters != null) {
            for (var i = 0; i < filters.length; i++) {
              filters[i].operator = filters[i].operand;
            }
          }
          domo.filterContainer(filters);
        }
      }
    });
  }

  function addChart(chart) {
    charts.push(chart);
    chart.addEventListener("cardbus", (ev) => triggerBus(chart, ev));
  }

  return {
    addChart: addChart,
    triggerBus: triggerBus,
  };
}

const newData = {
  rows: [
    ["Michael Scott", 43],
    ["Jim Halpert", 36],
    ["Dwight Schrute", 41],
  ],
  columns: [
    {
      type: DomoPhoenix.DATA_TYPE.STRING,
      name: "Name",
      mapping: DomoPhoenix.MAPPING.ITEM,
    },
    {
      type: DomoPhoenix.DATA_TYPE.DOUBLE,
      name: "Age",
      mapping: DomoPhoenix.MAPPING.VALUE,
    },
  ],
};

function boxChecked() {
  if (exclude.checked) {
    domo
      .post(
        `/sql/v1/${datasets[1]}`,
        `SELECT DATE("Event_Time"), COUNT("User_ID") FROM ${datasets[1]} WHERE "Object_ID" = ${domo.env.pageId} AND "Security Profile" != 'Admin' GROUP BY DATE("Event_Time")`,
        { contentType: "text/plain" }
      )
      .then(function reload(data) {
        console.log(data);
        const newData = {
          rows: data.rows,
          columns: [
            {
              type: DomoPhoenix.DATA_TYPE.STRING,
              name: "Event_Time",
              mapping: DomoPhoenix.MAPPING.ITEM,
            },
            {
              type: DomoPhoenix.DATA_TYPE.DOUBLE,
              name: 'Count("Object_Name")',
              mapping: DomoPhoenix.MAPPING.VALUE,
            },
          ],
        };

        chart.update(newData);
      });
  } else {
    domo
      .post(
        `/sql/v1/${datasets[1]}`,
        `SELECT DATE("Event_Time"), COUNT("User_ID") FROM ${datasets[1]} WHERE "Object_ID" = ${domo.env.pageId} GROUP BY DATE("Event_Time")`,
        { contentType: "text/plain" }
      )
      .then(function reload(data) {
        console.log(data);
        const newData = {
          rows: data.rows,
          columns: [
            {
              type: DomoPhoenix.DATA_TYPE.STRING,
              name: "Event_Time",
              mapping: DomoPhoenix.MAPPING.ITEM,
            },
            {
              type: DomoPhoenix.DATA_TYPE.DOUBLE,
              name: 'Count("Object_Name")',
              mapping: DomoPhoenix.MAPPING.VALUE,
            },
          ],
        };

        chart.update(newData);
      });
  }
}
