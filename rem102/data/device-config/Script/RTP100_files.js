/*	Main JQuery Function
	Author: Hasler Rail Italy
	Version: 1.0
	applicability: RTP100_files.html
----------------------------------------------------- */
var cgi = "";
var get_list_query = "";
var get_brd_query = "";
var get_file_query = "";
var prev_brd_sel = "";
var curr_brd_sel = "";
var curr_brd_id = "";
var CONST_FILES_PER_PAGE = 20;
var CONST_PAGE_PER_PAGER = 10;
var currPage = 1;

$(document).ready(function(){

    $.ajaxSetup({ cache: false, async: false});

    var cyc = parseInt(urlParam('cyclicTime'),10);
    $("h1").text(unescape(urlParam('label')));

    cgi = urlParam('cgi');
    get_list_query = urlParam('query');
    get_brd_query = urlParam('set');
    get_file_query = urlParam('set1');

    $("#load").append($("<table>").attr("id","table_rtp100_brd").append($("<thead>")).append($("<tbody>"))); //Create the table for the box of the RTP100 Board selection

    $("#load").append($("<img>").attr("id","loading-img").attr("src","/Images/loading.gif").attr("alt","Please Wait"));

    $("#load").append($("<table>").attr("id","table_rtp100_files").append($("<thead>")).append($("<tbody>"))); //Create the table for the RTP100 Board Files list

    //Create the box for the selection of the RTP100 Board
    eseguiAjax(cgi, get_brd_query, create_RTP100_Board_Table, null, false);

    //Create the Files table
    var params_query_string = get_list_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value")+ "&file_index=0";
    eseguiAjax(cgi, params_query_string, create_RTP100_Files_Table, null, false);

    prev_brd_sel = $("#select_value_rtp100_brd option:selected").attr("value");

    if (cyc>0) {
        setInterval(function() {

            curr_brd_sel = $("#select_value_rtp100_brd option:selected").attr("value");
            if(prev_brd_sel != curr_brd_sel)
            {
                prev_brd_sel = curr_brd_sel;
                currPage = 1;
            }

            $("#table_rtp100_files thead tr").empty();
            $("#table_rtp100_files tbody ").empty();

            //Create the table, filled with the Info relative to the selected RTP100 Board
            var params_query_string = get_list_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value") + "&file_index=0";
            eseguiAjax(cgi, params_query_string, update_RTP100_Files_Table, null, false);

        },cyc);
    }
});

var create_RTP100_Board_Table = function(data){

    var selected = "";

    $(data).each(function(index, val) {
        switch(val.type){
            case "select":
                switch (val.tag.toLowerCase()){
                    case "rtp100_brd":
                        $("#table_rtp100_brd tbody").append($("<tr>").attr("id","tr_body_rtp100_brd_name"));
                        $("#tr_body_rtp100_brd_name").append($("<td>").attr("id","td_name_brd").text("RTP100 name:"));
                        $("#tr_body_rtp100_brd_name").append($("<td>").attr("id","td_value_brd").css('color', val.color));
                        $("#td_value_brd").append("<select type=\"text\" name=\""+val.tag.toLowerCase()+"\" id=\"select_value_"+val.tag.toLowerCase()+"\">").append($("<span>").html("&#9660"));
                        selected = val.value;
                        break
                }
                break;

            case "option":
                switch (val.tag.toLowerCase()){
                    case "rtp100_brd":
                        if(val.value == selected){
                            $("#select_value_"+val.tag.toLowerCase()+"").append($("<option>").attr("id", "option_" + val.tag + "_" + index).attr("value",val.value).attr("selected","selected").text(val.options));
                        }
                        else{
                            $("#select_value_"+val.tag.toLowerCase()+"").append($("<option>").attr("id", "option_" + val.tag + "_" + index).attr("value",val.value).text(val.options));
                        }
                        break;
                }
                break;
        }
    });
}

function sortmyway(data_A, data_B){
	return (data_A.column_no - data_B.column_no);
}

var create_RTP100_Files_Table = function(data){

    var colNum = 0;
    var myArray = [];

    $("#table_rtp100_files").hide();
    $('#loading-img').show();

    $("#table_rtp100_files thead").append($("<tr>").attr("id", "tr_header"));

    $.each(data, function (i, item) {

        switch (item.type.toLowerCase()) {
            case "header":
                if (item.table_head.length > 0) {

					item.table_head = item.table_head.sort(function sortmyway(data_A, data_B) {
						return (data_A.column_no - data_B.column_no);
					});

					colNum = item.table_head.length;

					$.each(item.table_head, function (j, head) {
						var elemet = [];
						$("#tr_header").append($('<th>').attr("id",head.column_name).text(head.column_label));
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
				if (item.table_rows.length > 0) {

                    //Check if a file transfer is in progress
                    var total_file_num = item.table_rows.length;
                    var stored_file_num = data[1].count;

                    if( total_file_num > stored_file_num)
                    {
                        var element = item.table_rows[total_file_num - 1];

                        $("#table_rtp100_files tbody").append($("<tr>").attr("id", "tr_body_transfer"));

                        for (var rn = 0; rn < colNum; rn++) {
							if (myArray[rn][1] == "") {
								if (rn == 0)
                                {
                                    $("#tr_body_transfer").append($('<th>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "grey"));
                                }
                                else if (rn == colNum-1)
                                {
                                    $("#tr_body_transfer").append($('<th>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "red"));
                                }
                                else
                                {
                                    $("#tr_body_transfer").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "grey"));
                                }
							}
							else
                            {
                                $("#tr_body_transfer").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "grey"));
                            }
						}
                    }

					$.each(item.table_rows, function (j, eve) {
                        if(j < stored_file_num)
                        {
                            $("#table_rtp100_files tbody").append($("<tr>").attr("id", "tr_body_"+ j +""));

                            for (var rn = 0; rn < colNum; rn++) {
                                if (myArray[rn][1] == "") {
                                    if (rn == 0)
                                        $("#tr_body_"+ j +"").append($('<th>').attr("id", "td_"+ myArray[rn][0] +"_"+ j +"").text(eve[myArray[rn][0]]));
                                    else
                                        $("#tr_body_"+ j +"").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_"+ j +"").text(eve[myArray[rn][0]]));
                                }
                                else
                                {
                                    $("#tr_body_"+ j +"").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_"+ j +"").append($("<a>").attr("href", "#").attr("OnClick", "downloadFile('" + urlParam('cgi') + "?" + get_file_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value") + "&" + myArray[rn][0] + "=" + eve[myArray[rn][0]] + "')").text(eve[myArray[rn][0]])));
                                }
                            }
                        }
					});
				}
				else {
                    $("#table_rtp100_files tbody").append($("<tr>").append($('<td>').attr('colspan', colNum).text("There are no files available in this device")));
				}
				break;
        }
    });

    pagination(data[1].count);

    $("#table_rtp100_files").show();
    $('#loading-img').hide();
}


var update_RTP100_Files_Table = function(data){

    var colNum = 0;
    var myArray = [];

    $("#table_rtp100_files").hide();
    $('#loading-img').show();

    $.each(data, function (i, item) {

        switch (item.type.toLowerCase()) {
            case "header":
                if (item.table_head.length > 0) {

					item.table_head = item.table_head.sort(function sortmyway(data_A, data_B) {
						return (data_A.column_no - data_B.column_no);
					});

					colNum = item.table_head.length;

					$.each(item.table_head, function (j, head) {
						var elemet = [];
						$("#tr_header").append($('<th>').attr("id",head.column_name).text(head.column_label));
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
				if (item.table_rows.length > 0) {

                    //Check if a file transfer is in progress
                    var total_file_num = item.table_rows.length;
                    var stored_file_num = data[1].count;

                    if( total_file_num > stored_file_num)
                    {
                        var element = item.table_rows[total_file_num - 1];

                        $("#table_rtp100_files tbody").append($("<tr>").attr("id", "tr_body_transfer"));

                        for (var rn = 0; rn < colNum; rn++) {
							if (myArray[rn][1] == "") {
								if (rn == 0)
                                {
                                    $("#tr_body_transfer").append($('<th>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "grey"));
                                }
                                else if (rn == colNum-1)
                                {
                                    $("#tr_body_transfer").append($('<th>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "red"));
                                }
                                else
                                {
                                    $("#tr_body_transfer").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "grey"));
                                }
							}
							else
                            {
                                $("#tr_body_transfer").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_transfer").text(element[myArray[rn][0]]).css("color", "grey"));
                            }
						}
                    }

					$.each(item.table_rows, function (j, eve) {
                        if(j < stored_file_num)
                        {
                            $("#table_rtp100_files tbody").append($("<tr>").attr("id", "tr_body_"+ j +""));

                            for (var rn = 0; rn < colNum; rn++) {
                                if (myArray[rn][1] == "") {
                                    if (rn == 0)
                                        $("#tr_body_"+ j +"").append($('<th>').attr("id", "td_"+ myArray[rn][0] +"_"+ j +"").text(eve[myArray[rn][0]]));
                                    else
                                        $("#tr_body_"+ j +"").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_"+ j +"").text(eve[myArray[rn][0]]));
                                }
                                else
                                {
                                    $("#tr_body_"+ j +"").append($('<td>').attr("id", "td_"+ myArray[rn][0] +"_"+ j +"").append($("<a>").attr("href", "#").attr("OnClick", "downloadFile('" + urlParam('cgi') + "?" + get_file_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value") + "&" + myArray[rn][0] + "=" + eve[myArray[rn][0]] + "')").text(eve[myArray[rn][0]])));
                                }
                            }
                        }
					});
				}
				else {
                    $("#table_rtp100_files tbody").append($("<tr>").append($('<td>').attr('colspan', colNum).text("There are no files available in this device")));
				}
				break;
        }
    });

    pagination(data[1].count);

    $("#table_rtp100_files").show();
    $('#loading-img').hide();
}


function pagination(total_num_row) {

    if(total_num_row <= CONST_FILES_PER_PAGE)
    {
		$('.paginationcontainer').hide();
    }
	else
    {
		$('.paginationcontainer').show();
    }

    $('.pagecount').html(total_num_row);

    // Total number of pages
	var total_num_pages = Math.ceil(total_num_row / CONST_FILES_PER_PAGE);

    // Calculate first page from which paginator must start to render
	var paginatorStart = paginatorStartPosition(currPage);

    var lastPage = Math.ceil(total_num_row / CONST_FILES_PER_PAGE);

    // Draw "Previous" ecc "<<", "<"
	$('.pagination').empty();
    if(total_num_pages > CONST_PAGE_PER_PAGER && currPage > 1) {
		jQuery('.pagination').append("<li data-from='1'>&lt;&lt;</li>");
		jQuery('.pagination').append("<li data-from='" + (paginatorStart - CONST_PAGE_PER_PAGER + 1) + "'>&lt;</li>");
	}

    // Draw pages "n...n+9"
    for(var i=0; (currPage + i <= total_num_pages) && i < CONST_PAGE_PER_PAGER; i++)
    {
        var hightlightPage = "";
        var pageNumber = paginatorStart + i + 1;

        if(pageNumber == currPage)
        {
            hightlightPage = " currpage";
        }

        jQuery('.pagination').append("<li data-from='" + pageNumber + "' class='btn" + hightlightPage + "'>" + pageNumber + "</li>");
    }

    // Draw "Next" ecc ">", ">>"
	if (total_num_pages > CONST_PAGE_PER_PAGER && currPage < lastPage) {
		jQuery('.pagination').append("<li data-from='" + (paginatorStart + CONST_PAGE_PER_PAGER + 1 ) + "'>&gt;</li>");
		jQuery('.pagination').append("<li data-from='" + lastPage + "'>&gt;&gt;</li>");
	}

    jQuery('.pagination li').click(function (e) {
        e.preventDefault();

        currPage = $(this).data('from');
        var start = (currPage - 1) * CONST_FILES_PER_PAGE;

        // Clear table and load selected page from server
        $("#table_rtp100_files thead").empty();
        $("#table_rtp100_files tbody").empty();

        //Create the table, filled with the Info relative to the selected RTP100 Board
        var params_query_string = get_list_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value")+ "&file_index=" + start;
        eseguiAjax(cgi, params_query_string, create_RTP100_Files_Table, null, false);
    });
}

function paginatorStartPosition(position) {
	return(Math.floor((position - 1) / CONST_PAGE_PER_PAGER) * CONST_PAGE_PER_PAGER);
}

function downloadFile(path) {
	$(location).attr('href', path);
}