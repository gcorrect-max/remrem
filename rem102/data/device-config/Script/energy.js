/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.1
	applicability: energy.html
	
	Change history
	1.1 change tick;
----------------------------------------------------- */

var offset;
var Active_CHA = [];
var Reactive_CHA = [];
var Apparent_CHA = [];
var Voltage = [];
var Amperage = [];
var plot1;
var plot2;

	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("h1").text(unescape(urlParam('label')));
	
	var queryy = urlParam('query') != null ? urlParam('query').replace(/\~/g, '&') : "";

	$.each(queryy.split('&'), function(i, item){
		var ele = item.split('=');
		if (ele[0] == "block_offset"){
			offset = ele[1];
			return;
		}
	});
	
	eseguiAjax(urlParam('cgi'),queryy, CreateChart, null, true);
	$("#chart_container").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),queryy, CreateChart, null, false);
		},cyc);
	}
});

var CreateChart = function (data){
	var a; var r; var ap; var time; var total; var volt; var amp; var max_volt; var max_amp;
	$.each(data, function(i, item) {
		switch (item.tag.toLowerCase()){
			//potenza attiva
			case "remshm_"+offset+"_64":
				a = parseFloat(item.value);
				$("#pa").text(a.numberFormat(3));
			break;
			//potenza reattiva
			case "remshm_"+offset+"_96":
				r = parseFloat(item.value);
				$("#pr").text(r.numberFormat(3));
			break;
			//potenza apparente
			case "remshm_"+offset+"_128":
				ap = parseFloat(item.value);
				$("#pap").text(ap.numberFormat(3));
			break;
			case "remshm_"+offset+"_160":
				$("#cos").text(parseFloat(item.value).numberFormat(3));
			break;
			case "remshm_"+offset+"_224":
				time = parseInt(item.value);				
			break;
			case "remshm_"+offset+"_192":
				total = parseInt(item.value);				
			break;
			case "remshm_"+offset+"_0":
				volt = parseFloat(item.value);
				$("#v").text(volt.numberFormat(3));				
			break;
			case "remshm_"+offset+"_32":
				amp = parseFloat(item.value);
				$("#i").text(amp.numberFormat(3));
			break;
			case "remshm_"+offset+"_256":
				$("#eap").text(parseFloat(item.value).numberFormat(3));
			break;
			case "remshm_"+offset+"_288":
				$("#eat").text(parseInt(item.value).numberFormat(0));	
			break;
			case "remshm_"+offset+"_320":
				$("#enp").text(parseFloat(item.value).numberFormat(3));	
			break;
			case "remshm_"+offset+"_352":
				$("#ent").text(parseInt(item.value).numberFormat(0));	
			break;
			case "remshm_"+offset+"_384":
				$("#erp").text(parseFloat(item.value).numberFormat(3));	
			break;
			case "remshm_"+offset+"_416":
				$("#ert").text(parseInt(item.value).numberFormat(0));
			break;
			case "remshm_"+offset+"_448":
				$("#enrp").text(parseFloat(item.value).numberFormat(3));
			break;
			case "remshm_"+offset+"_480":
				$("#enrt").text(parseInt(item.value).numberFormat(0));
			break;
			case "remshm_"+offset+"_544":
				max_volt = parseFloat(item.value)*1.4;	
			break;
			case "remshm_"+offset+"_576":
				max_amp = parseFloat(item.value)*1.3;
			break;
		}
	});

	if (time == 1){
		$("#chart_container").empty();
		location.reload();
	}
	else{
		$("#p").text(time+" / "+total);				
	
		Active_CHA.push([time, a]); 
		Reactive_CHA.push([time, r]); 
		Apparent_CHA.push([time, ap]);
		Voltage.push([time, volt]);
		Amperage.push([time, amp]);
		
		var tick = 5;
		switch (total){
			case 30:
				tick = (total/6)+2;
				break;
			case 60:
				tick = (total/12)+2;
				break;
			case 300:
				tick = (total/60)+2;
				break;
		}
		
		plot1 = $.jqplot('chart', [Active_CHA, Reactive_CHA, Apparent_CHA], 
		{ 
		 seriesColors: ["rgb(211, 235, 59)", "rgba(255, 0, 0, 0.7)", "rgba(78, 135, 194, 0.7)"],
					highlighter: {
						show: true,
						sizeAdjust: 1,
						tooltipOffset: 9
					},
					grid: {
						drawBorder: false,
						shadow: false,
						gridLineColor: '#dddddd',
						gridLineWidth: 1
					}, 
		  // Set default options on all series, turn on smoothing.
		  seriesDefaults: {
			  rendererOptions: {
				  smooth: true
			  },
			  showMarker: false
		  },
			legend: {
				show: true,
				renderer: $.jqplot.EnhancedLegendRenderer,
                                rendererOptions: {
                                numberRows: 1
                                },
				placement: 'outsideGrid',
				location: 's'
			},
		  // Series options are specified as an array of objects, one object
		  // for each series.
		  series: [
				{
					label: 'Active'
				},
				{
					label: 'Reactive'
				},
				{
					label: 'Apparent'
				}
			],
			
			axes: {
				xaxis: {
					label: "Period [s]",
					labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
					labelOptions: {
						fontFamily: "100% arial, helvetica, serif"	,
						fontSize: '10pt'
					},
					min: 0,
					max: total,				
					drawMajorGridlines: false,
					color:'#dddddd',
					numberTicks : tick,
					tickOptions: {
						formatString: "%d"
					}
				},
				yaxis: {
					label: "Power [KW]",
					labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
					labelOptions: {
						fontFamily: "100% arial, helvetica, serif"	,
						fontSize: '10pt'
					}
				}
			}
		}
	  );
	  plot1.redraw();
	  
	  plot2 = $.jqplot('chart2', [Voltage, Amperage], 
		{ 
		 seriesColors: ["rgb(211, 235, 59)", "rgba(255, 0, 0, 0.7)"],
					highlighter: {
						show: true,
						sizeAdjust: 1,
						tooltipOffset: 9
					},
					grid: {
						drawBorder: false,
						shadow: false,
						gridLineColor: '#dddddd',
						gridLineWidth: 1
					}, 
		  // Set default options on all series, turn on smoothing.
		  seriesDefaults: {
			  rendererOptions: {
				  smooth: true
			  },
			  showMarker: false
		  },
		   legend: {
				show: true,
				renderer: $.jqplot.EnhancedLegendRenderer,
                                rendererOptions: {
                                numberRows: 1
                                },
				placement: 'outsideGrid',
				location: 's'
			},
		  // Series options are specified as an array of objects, one object
		  // for each series.
		  series: [
				{
					label: 'Voltage'
				},
				{
					label: 'Amperage',
					yaxis:'y2axis'
				}
			],
			
			axes: {
				xaxis: {
					label: "Period [s]",
					labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
					labelOptions: {
						fontFamily: "100% arial, helvetica, serif"	,
						fontSize: '10pt'
					},
					min: 0,
					max: total,				
					drawMajorGridlines: false,
					color:'#dddddd',
					numberTicks : tick,
					tickOptions: {
						formatString: "%d"
					}
				},
				yaxis: {
					min: 0,
					max: max_volt,
					label: "Voltage [V]",
					labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
					labelOptions: {
						fontFamily: "100% arial, helvetica, serif"	,
						fontSize: '10pt'
					}
				},
				y2axis: {
					min: 0,
					max: max_amp,
					label: "Amperage [A]",
					labelRenderer: $.jqplot.CanvasAxisLabelRenderer,
					labelOptions: {
						fontFamily: "100% arial, helvetica, serif"	,
						fontSize: '10pt'
					}
				}
			}
		}
	  );
	plot2.redraw();
	}
};

Number.prototype.numberFormat = function(decimals, dec_point, thousands_sep) {
    dec_point = typeof dec_point !== 'undefined' ? dec_point : '.';
    thousands_sep = typeof thousands_sep !== 'undefined' ? thousands_sep : ' ';

    var parts = this.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands_sep);

    return parts.join(dec_point);
}

