/*	Main JQuery Function
	Author: Hasler Rail Italy
	Version: 1.0
	applicability: RTP100_cmd.html
----------------------------------------------------- */
var cgi = "";
var get_var_query = "";
var get_brd_query = "";
var set_cmd_query = "";
var prev_brd_sel = "";
var curr_brd_sel = "";
var curr_brd_id = "";

$(document).ready(function(){

    $.ajaxSetup({ cache: false, async: false});

    var cyc = parseInt(urlParam('cyclicTime'),10);
    $("h1").text(unescape(urlParam('label')));

    cgi = urlParam('cgi');
    get_var_query = urlParam('query');
    get_brd_query = urlParam('set');
    set_cmd_query = urlParam('set1');

    $("#load").append($("<table>").attr("id","table_rtp100_brd").append($("<thead>")).append($("<tbody>"))); //Create the table for the box of the RTP100 Board selection

    $("#load").append($("<table>").attr("id","table_rtp100_cmd_var").append($("<thead>")).append($("<tbody>"))); //Create the table for the selected RTP100 Board command variables

    //Create the box for the selection of the RTP100 Board
    eseguiAjax(cgi, get_brd_query, create_RTP100_Board_Table, null, false);

    //Create the Cmd Variable table, filled with the Command Variables relative to the selected RTP100 Board
    var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
    eseguiAjax(cgi, params_query_string, create_RTP100_Cmd_Variables_Table, null, false);

    prev_brd_sel = $("#select_value_rtp100_brd option:selected").attr("value");

    if (cyc>0) {
        setInterval(function() {

            curr_brd_sel = $("#select_value_rtp100_brd option:selected").attr("value");
            if(prev_brd_sel != curr_brd_sel)
            {
                prev_brd_sel = curr_brd_sel;
                $("#table_rtp100_cmd_var thead").empty();
                $("#table_rtp100_cmd_var tbody").empty();

                //Create the table, filled with the Info relative to the selected RTP100 Board
                var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
                eseguiAjax(cgi, params_query_string, create_RTP100_Cmd_Variables_Table, null, false);
            }
            
            //var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
            //eseguiAjax(cgi, params_query_string, update_RTP100_Cmd_Variables_Table, null, false);
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

var create_RTP100_Cmd_Variables_Table = function(data){

    $("#table_rtp100_cmd_var thead").append($("<tr>").attr("id", "tr_header"));
    $("#tr_header").append($("<th>").attr("id", "th_header_name")); //Create the cell for the RTP100 variables "Name" column's title
    $("#tr_header").append($("<th>").attr("id", "th_header_value")); //Create the cell for the RTP100 variables "Value" column's title
    $("#tr_header").append($("<th>").attr("id", "th_header_set")); //Create the cell for the RTP100 variables "Set" column's title

    $("#th_header_name").text("NAME");
    $("#th_header_value").text("VALUE");
    $("#th_header_set").text("SET");

    $(data).each(function(index, val) {

        switch (val.type.toLowerCase()){
            case "text":
                switch (val.tag.toLowerCase()){
                    case "rtp100_brd":
                        curr_brd_id = val.options;
                        break;
                }
                break;

            case "input":
                switch (val.tag.toLowerCase()){
                    case "rtp100_cmd_var":

                        $("#table_rtp100_cmd_var tbody").append($('<tr>').attr("id", "tr_body_rtp100_cmd_var_" + index + ""));

                        $("#tr_body_rtp100_cmd_var_" + index + "").append($('<th>').attr("id", "td_name_rtp100_cmd_var_"+ index +"").text(val.label));
 
                        $("#tr_body_rtp100_cmd_var_" + index + "").append($('<td>').attr("id", "td_value_rtp100_cmd_var_"+ index +""));

                        $("#td_value_rtp100_cmd_var_" + index + "").append($("<form>").attr("id", "form_value_var_"+ index +""));
                        $("#form_value_var_"+ index + "").attr("action", cgi).attr("class", "form_cmd_var_class");
                        $("#form_value_var_"+ index + "").append($("<input>").attr("type","text").attr("id","id_cmd_var_"+ index + "").attr("name","rtp100_cmd_var_value").attr("value","" + val.value + ""));
                        $("#form_value_var_"+ index + "").submit( function(event){RTP100_Set_Command(event, index); return false;});

                        $("#tr_body_rtp100_cmd_var_" + index + "").append($('<td>').attr("id", "td_set_rtp100_var_"+ index +"") );

                        $("#td_set_rtp100_var_" + index + "").append($("<form>").attr("id", "form_cmd_var_"+ index +""));
                        $("#form_cmd_var_"+ index + "").attr("action", cgi).attr("class", "form_cmd_var_class");
                        $("#form_cmd_var_"+ index + "").append($("<input>").attr("type","hidden").attr("name","rtp100_brd").attr("value",curr_brd_id));
                        $("#form_cmd_var_"+ index + "").append($("<input>").attr("type","hidden").attr("name","rtp100_cmd_var_name").attr("value",val.label));
                        $("#form_cmd_var_"+ index + "").append($("<input>").attr("type","submit").attr("id","set_button").val("Set Value"));
                        $("#form_cmd_var_"+ index + "").submit( function(event){RTP100_Set_Command(event, index); return false;});
                        break;
                }
                break;
        }
    });
}


var update_RTP100_Cmd_Variables_Table = function(data){

    $(data).each(function(index, val) {
        switch (val.type.toLowerCase()){
            case "input":
                switch (val.tag.toLowerCase()){
                    case "rtp100_brd":
                        break;

                    case "rtp100_cmd_var":
                        $("#td_name_rtp100_cmd_var_"+ index +"").text(val.label);
                        $("#id_cmd_var_"+ index + "").val(val.value);
                        break;
                }
                break;
        }
    });
}


function RTP100_Set_Command(event, index){

	event.isImmediatePropagationStopped();

	openDialog("Confirmation!",
			   "Do you want to set the command?",
			   "#4a4a4a",
			   { "Yes": function(){ window.top.$("#dialog").dialog("destroy");
									window.top.$("body").append("<div id=\"overlaydiv\" class=\"ui-widget-overlay ui-front\"><div id=\"wait\"></div></div>");									 
									window.top.$('#wait').css({width:'200px',height:'100px',color:'white',margin:'0 auto',}).center();

									var url = $("#form_cmd_var_"+ index +"").attr("action");
									var str = set_cmd_query + "&" + $("#form_cmd_var_"+ index +"").serialize() + "&" + $("#form_value_var_"+ index + "").serialize();
									var msg =""; var btn = ""; var tit = "";  var col = "";
									var error= false;
									var posting = $.post( url, str );
									 
									posting.done(function(data){
										var obj = jQuery.parseJSON(data);
                                        $(obj).each(function(index, val) {
                                            if(val.value.toLowerCase() == "fail"){
                                                error = true;
                                                col=  ROSSO;
                                                tit = "Command error!";
                                                if(val.reference.toLowerCase() == "login")
                                                {
                                                    msg = "The command set is not allowed by the device.<br>Try with higher level credentials";
                                                }
                                                else
                                                {
                                                    msg = "The command set is not allowed by the device.<br>Something has gone wrong!";
                                                }
                                                btn = { "OK": function(){ window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
                                            }
                                            else if (val.value.toLowerCase() == "error"){
                                                error = true;
                                                col=  ROSSO;
                                                tit = "Command error!";
                                                msg = "The change is not allowed by the device.<br>Something has gone wrong!";
                                                btn = { "OK": function() { window.top.$("#dialog").dialog("destroy"); window.location.reload();}};
                                            }
                                            else if (val.value.toLowerCase() == "ok"){
                                                error = false;
                                                col=  "green";
                                                tit = "Command set!";
                                                msg = "Command set succesfully!";
                                                btn = { "Ok": function() { window.top.$("#overlaydiv").remove(); window.top.$("#dialog").dialog("destroy");} 
                                                };

                                                var params_query_string = get_var_query + "&" + $("#select_value_rtp100_brd").attr("name") + "=" + $("#select_value_rtp100_brd option:selected").attr("value");
                                                eseguiAjax(cgi, params_query_string, update_RTP100_Cmd_Variables_Table, null, false);
                                            }
                                        });
									 })
									 .fail(function(xhr, textStatus, errorThrown) {
										error = true;
										col=  ROSSO;
										tit = "Command error!";
										msg = "Error: command not set";
										btn = { "OK": function() {window.top.$("#dialog").dialog("destroy"); window.location.reload();} };
									 })
									 .always(function() {
										if (error){
											openDialog(tit, msg, col, btn );
											window.top.$("#overlaydiv").remove();											
										}
										else{
											window.top.$("#overlaydiv").remove();
											openDialog(tit, msg, col, btn );										
										}
									});
						},
				"No" : function() { window.top.$("#dialog").dialog("close"); window.location.reload();}
			});
}