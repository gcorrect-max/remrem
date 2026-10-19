/*	Main JQuery Function
	Author: Hasler Rail Italy
	Version: 1.0
	applicability: RTP100_status.html
----------------------------------------------------- */
var cgi = "";
var get_var_query = "";
var get_brd_query = "";
var prev_brd_sel = "";
var curr_brd_sel = "";

$(document).ready(function(){

    $.ajaxSetup({ cache: false, async: false});

    var cyc = parseInt(urlParam('cyclicTime'),10);
    $("h1").text(unescape(urlParam('label')));

    cgi = urlParam('cgi');
    get_var_query = urlParam('query');
    get_brd_query = urlParam('set');

    $("#load").append($("<table>").attr("id","table_rtp100_brd").append($("<thead>")).append($("<tbody>"))); //Create the table for the box of the RTP100 Board selection

    $("#load").append($("<table>").attr("id","table_rtp100_var").attr("class", "table_rtp100_var_class").append($("<thead>")).append($("<tbody>"))); //Create the table for the selected RTP100 Board variables

    //Create the box for the selection of the RTP100 Board
    eseguiAjax(cgi, get_brd_query, create_RTP100_Board_Table, null, false);

    //Create the Variable table, filled with the Info relative to the selected RTP100 Board
    var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
    eseguiAjax(cgi, params_query_string, create_RTP100_Variables_Table, null, false);

    prev_brd_sel = $("#select_value_rtp100_brd option:selected").attr("value");

    if (cyc>0) {
        setInterval(function() {

            curr_brd_sel = $("#select_value_rtp100_brd option:selected").attr("value");
            if(prev_brd_sel != curr_brd_sel)
            {
                prev_brd_sel = curr_brd_sel;
                $("#table_rtp100_var thead").empty();
                $("#table_rtp100_var tbody").empty();

                //Create the table, filled with the Info relative to the selected RTP100 Board
                var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
                eseguiAjax(cgi, params_query_string, create_RTP100_Variables_Table, null, false);
            }
            
            var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
            eseguiAjax(cgi, params_query_string, update_RTP100_Variables_Table, null, false);
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
                        $("#table_rtp100_brd tbody").append($("<tr>").attr("id","tr_body_rtp100_brd_status"));
                        $("#tr_body_rtp100_brd_status").append($("<td>").attr("id","td_name_status").text("RTP100 status:"));
                        $("#tr_body_rtp100_brd_status").append($("<td>").attr("id","td_value_status"));
                        $("#td_value_status").append($("<img>").attr("id", "image_rtp100_brd_status"));

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

var create_RTP100_Variables_Table = function(data){

    $("#table_rtp100_var thead").append($("<tr>").attr("id", "tr_header").append($("<th>").attr("id", "th_header_name"))); //Create the cell for the RTP100 variables "Name" column's title
    $("#tr_header").append($("<th>").attr("id", "th_header_value")); //Create the cell for the RTP100 variables "Value" column's title
    $("#tr_header").append($("<th>").attr("id", "th_header_check")); //Create the cell for the RTP100 variables "Check" column's title

    $("#th_header_name").text("NAME");
    $("#th_header_value").text("VALUE");
    $("#th_header_check").text("CHECK");

    $("#tr_header").append($("<th>").attr("id", "th_header_fresh").hide()); //Create the cell for the RTP100 variables "Freshness" column's title
    $("#th_header_fresh").text("FRESHNESS");

    $(data).each(function(index, val) {

        switch (val.type.toLowerCase()){
            case "text":
                switch (val.tag.toLowerCase()){
                    case "rtp100_brd":
                        if(val.value == "valid")
                        {
                            $("#image_rtp100_brd_status").attr("src","/Images/led_verde.png").css("padding","2px").css("vertical-align","middle");
                        }
                        else
                        {
                            $("#image_rtp100_brd_status").attr("src","/Images/led_grigio.png").css("padding","2px").css("vertical-align","middle");
                        }
                        break;
                    case "rtp100_var":
                        $("#table_rtp100_var tbody").append($('<tr>').attr("id", "tr_body_rtp100_var_" + index + ""));

                        $("#tr_body_rtp100_var_" + index + "").append($('<th>').append($('<p>').attr("id", "td_name_rtp100_var_"+ index +"").text(val.label)));
 
                        $("#tr_body_rtp100_var_" + index + "").append($('<td>').attr("id", "td_value_rtp100_var_"+ index +"").css('color', val.color).html(val.value));

                        $("#tr_body_rtp100_var_" + index + "").append($('<td>').attr("id", "td_check_rtp100_var_"+ index +"").append($("<img>").attr("id", "img_chk_rtp100_var_"+ index +"")) );

                        var options_array = val.options.split(";");
                        var check_array = options_array[0].split("=");
                        var fresh_array = options_array[1].split("=");

                        if(check_array[1] == "0")
                        {
                            $("#img_chk_rtp100_var_"+ index +"").attr("src","/Images/valid.png").css("padding","2px").css("vertical-align","middle");
                        }
                        else if(check_array[1] == "1")
                        {
                            $("#img_chk_rtp100_var_"+ index +"").attr("src","/Images/invalid.png").css("padding","2px").css("vertical-align","middle");
                        }
                        else
                        {
                            $("#img_chk_rtp100_var_"+ index +"").attr("src","");
                        }

                        if(fresh_array[1] != undefined)
                        {
                            $("#th_header_fresh").show();
                            $("#tr_body_rtp100_var_" + index + "").append($('<td>').attr("id", "td_value_rtp100_fresh_"+ index +"").css('color', val.color).html(fresh_array[1]));
                        }
                        break;
                }
                break;
        }
    });
}

var update_RTP100_Variables_Table = function(data){

    $(data).each(function(index, val) {

        switch (val.type.toLowerCase()){
            case "text":
                switch (val.tag.toLowerCase()){
                    case "rtp100_brd":
                        if(val.value == "valid")
                        {
                            $("#image_rtp100_brd_status").attr("src","/Images/led_verde.png").css("padding","2px").css("vertical-align","middle");
                        }
                        else
                        {
                            $("#image_rtp100_brd_status").attr("src","/Images/led_grigio.png").css("padding","2px").css("vertical-align","middle");
                        }
                        break;
                    case "rtp100_var":
                        $("#td_name_rtp100_var_"+ index +"").text(val.label);
                        $("#td_value_rtp100_var_" + index + "").css('color', val.color).html(val.value);

                        var options_array = val.options.split(";");
                        var check_array = options_array[0].split("=");
                        var fresh_array = options_array[1].split("=");

                        if(check_array[1] == "0")
                        {
                            $("#img_chk_rtp100_var_"+ index +"").attr("src","/Images/valid.png").css("padding","2px").css("vertical-align","middle");
                        }
                        else if(check_array[1] == "1")
                        {
                            $("#img_chk_rtp100_var_"+ index +"").attr("src","/Images/invalid.png").css("padding","2px").css("vertical-align","middle");
                        }
                        else
                        {
                            $("#img_chk_rtp100_var_"+ index +"").attr("src","");
                        }

                        if(fresh_array[1] != undefined)
                        {
                            $("#th_header_fresh").show();
                            $("#td_value_rtp100_fresh_"+ index +"").css('color', val.color).html(fresh_array[1]);
                        }
                        break;
                }
                break;
        }
    });
}