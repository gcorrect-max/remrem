/*	Main JQuery Function
	Author: Gianluca Maimeri
	Version: 1.0
	applicability: pie.html
----------------------------------------------------- */
	
/*	Funzione JQuery che viene eseguita 
	quando il documento è caricato.
	Se esiste l'input query esegue la cgi.
----------------------------------------------------- */
$(document).ready(function(){
	var cyc = parseInt(urlParam('cyclicTime'),10);
	$("h1").text(unescape(urlParam('label')));
	eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), CreatePie, null, true);
	$("#pie_container").fadeIn( "slow" );
	if (cyc>0){		
		setInterval(function() {
			eseguiAjax(urlParam('cgi'),urlParam('query').replace(/\~/g, '&'), CreatePie, null, false);
		},cyc);
	}
});

/*	function CreatePie
	Funzione necessaria per creare aggiornare una torta
	
	input:
	* data: dati Json 
	
	ToDo: funzione no completa, va gestito il type
----------------------------------------------------- */
var CreatePie = function (data){
	$.each(data, function(i, item) {
		switch (item.tag.toLowerCase()){
			case "use":	
				var use = parseInt(item.value.replace('%', ''),10);
				var free = 100-use;
				var Ar = [['Used',use], ['Free',free]];
					
				$.jqplot('chart', [Ar], {
					seriesColors: [ "#555555", "#E066FF"],
					grid: {
						drawBorder: false, 
						drawGridlines: false,
						background: '#ffffff',
						shadow:false
					},
					axesDefaults: {
						
					},
					seriesDefaults:{
						renderer:$.jqplot.PieRenderer,
						rendererOptions: {
							sliceMargin: 4,
							startAngle: 0,
							showDataLabels: true
						}
					},
					legend: {
						show: true,
						location: 's'
					}
				});
				break;
				default:
					$("tbody").append(
						$('<tr>').append(
							$('<th>').attr('title', item.label).attr('id', 'lab_'+item.tag).text(item.label)
						).append(
							$('<td>').attr('title', item.label).attr('id', 'td_'+item.tag).css('color', item.color).text(item.value)
						)
					);
					break;
			}
	});
	$("#pie_container").fadeIn( "slow" );
}