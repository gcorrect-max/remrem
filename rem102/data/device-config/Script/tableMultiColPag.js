/*	Main JQuery Function
 Author: Gianluca Maimeri
 Author 2: Giancarlo Voci
 Version: 1.2
 applicability: database.html
 ----------------------------------------------------- */

/*	Funzione JQuery che viene eseguita 
 quando il documento è caricato.
 Se esiste l'input query esegue la cgi.

 http://heartcode.robertpataki.com/canvasloader/

 ----------------------------------------------------- */

var from = 0,
	currPage = 1,
	CONST_FILES_PER_PAGE = 50,
	CONST_PAGE_PER_PAGER = 10;

$(document).ready(function () {

	$("#App_container h1").first().text(decodeURI(urlParam('label')));

	$('#loading-img').show();

	var url = $.trim($(location).attr('pathname'));
	var cgi = urlParam('cgi');
	var queryR = urlParam('query') != null ? urlParam('query').replace(/\~/g, '&') : "";

	eseguiAjax(cgi, queryR, buildAutoTable, null, true);

	$("#App_container").fadeIn("slow");


});

function sortmyway(data_A, data_B) {
	return (data_A.column_no - data_B.column_no);
}

/*	function buildTable Database
 Funzione necessaria per creare la tabella
 ed aggiornare il DOM

 input:
 * data: dati Json
 ----------------------------------------------------- */
var buildAutoTable = function (data) {

	var selected = "";
	$("thead tr").empty();
	$("tbody").empty();

	var conNum = 0;
	var myArray = [];

	// 07-11-2016 s.f. hide table to avoide flashing  pagination
	/* $("#paginated_table").hide(); */
	$('#loading-img').show();

	$.each(data, function (i, item) {
		switch (item.type.toLowerCase()) {
			case "header":
				if (item.table_head.length > 0) {

					item.table_head = item.table_head.sort(function sortmyway(data_A, data_B) {
						return (data_A.column_no - data_B.column_no);
					});

					conNum = item.table_head.length;
					$.each(item.table_head, function (j, head) {
						var elemet = [];
						$("thead tr").append($('<th>').text(head.column_label));
						elemet.push(head.column_name);
						if (head.cell_type == "link")
							elemet.push(head.method);
						else
							elemet.push("");
						myArray.push(elemet);
					});
				}
				break;
			case "data":
				var r = 0;
				if (item.table_rows.length > 0) {
					$.each(item.table_rows, function (j, eve) {
						$("tbody").append($('<tr>'));

						for (var rn = 0; rn < conNum; rn++) {
							if (myArray[rn][1] == "") {
								if (rn == 0)
									$("tbody tr:last").append($('<th>').attr('ID', 'td_' + myArray[rn][0] + "_" + j).text(eve[myArray[rn][0]]));
								else
									$("tbody tr:last").append($('<td>').attr('ID', 'td_' + myArray[rn][0] + "_" + j).text(eve[myArray[rn][0]]));
							}
							else
								$("tbody tr:last").append($('<td>').attr('ID', 'td_' + myArray[rn] + "_" + j).append($("<a>").attr("href", "#").attr("OnClick", "downloadFile('" + urlParam('cgi') + "?" + myArray[rn][1] + "&" + myArray[rn][0] + "=" + eve[myArray[rn][0]] + "')").text(eve[myArray[rn][0]])));
						}

					});
				}
				else {
					$("tbody").append(
						$('<tr>').append($('<td>').attr('colspan', conNum).text("There are no files available in this device")));
				}
				break;

		}
	});

	pagination(data[1].count);

	$("#paginated_table").show();
	$('#loading-img').hide(); //hide submit button	
}

function downloadFile(path) {
	$(location).attr('href', path);
}

function pagination(total_num_row) {

	if (total_num_row <= CONST_FILES_PER_PAGE)
		$('.paginationcontainer').hide();
	else
		$('.paginationcontainer').show();

	$('.pagecount').html(total_num_row);

	// number of pages
	var num_pages = Math.ceil(total_num_row / CONST_FILES_PER_PAGE);

	// Calculate first page from which paginator must start to render
	var paginatorStart = paginatorStartPosition(currPage);

	var lastPage = Math.ceil(total_num_row / CONST_FILES_PER_PAGE);

	// Draw "Previous" ecc "<<", "<"
	$('.pagination').empty();
	if (num_pages > 10 && currPage > 1) {
		jQuery('.pagination').append("<li data-from='1'>&lt;&lt;</li>");
		var goToPage = (paginatorStart - CONST_PAGE_PER_PAGER);
		jQuery('.pagination').append("<li data-from='" + (paginatorStart - CONST_PAGE_PER_PAGER + 1) + "'>&lt;</li>");
	}

	// Draw pages "1...10"
	for (var i = 0; i < num_pages && i < CONST_PAGE_PER_PAGER; i++) {
		var hightlightPage = "";
		var pageNumber = paginatorStart + i + 1;
		if (pageNumber == currPage)
			hightlightPage = " currpage";

		jQuery('.pagination').append("<li data-from='" + pageNumber + "' class='btn" + hightlightPage + "'>" + pageNumber + "</li>");
	}

	// Draw "Next" ecc ">", ">>"
	if (num_pages > 10 && currPage < lastPage) {
		var goToPage = (paginatorStart + CONST_PAGE_PER_PAGER);
		jQuery('.pagination').append("<li data-from='" + (paginatorStart + CONST_PAGE_PER_PAGER + 1 ) + "'>&gt;</li>");
		jQuery('.pagination').append("<li data-from='" + lastPage + "'>&gt;&gt;</li>");
	}

	jQuery('.pagination li').click(function (e) {
		e.preventDefault();
		var isPageSkip = ($(this).data('pageskip') != undefined);

		var pos = $(this).data('from');

		currPage = $(this).data('from');
		var start = (currPage - 1) * CONST_FILES_PER_PAGE;

		// Clear table and load selected page from server
		$("tbody").empty();
		$("thead tr").empty();

		var url = $.trim($(location).attr('pathname'));
		var cgi = urlParam('cgi');
		var queryR = urlParam('query') != null ? urlParam('query').replace(/\~/g, '&') : "";
		queryR += "&from=" + start;

		eseguiAjax(cgi, queryR, buildAutoTable, null, false)

	});

}

function positionToPaginator(position) {
	return (position - (Math.floor(position / CONST_PAGE_PER_PAGER) * CONST_PAGE_PER_PAGER));
}

function paginatorStartPosition(position) {
	return (Math.floor((position - 1) / CONST_PAGE_PER_PAGER) * CONST_PAGE_PER_PAGER);
}