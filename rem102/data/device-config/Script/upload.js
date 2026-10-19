
/*	funzione di recupero parametri GET
	
	input:
	* name: nome del parametro GET da recuperare

	output
	* valore del parametro GET richiesto
----------------------------------------------------- */
$.urlParam = function(name){
	return ((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

$(document).ready(function() {
	var progressbox     = $('#progressbox');
	var progressbar     = $('#progressbar');
	var statustxt       = $('#statustxt');
	var completed       = '0%';	
	var defaultext		= "sh";

        var clear_cgi = "/cgi-bin/mpc105.cgi";
        var clear_query = "query=311";
        eseguiAjax(clear_cgi, clear_query, null, null, false);

	$("h1").text(unescape($.urlParam('label')));
	var upquery = "<input type=\"hidden\" name=\"query\" value=\""+$.urlParam('set')+"\">";
	var spliQuery = $.urlParam('set').split("=");
	if (spliQuery.length > 1)
		upquery = "<input type=\"hidden\" name=\""+spliQuery[0]+"\" value=\""+spliQuery[1]+"\">";	
			
	$("#MyUploadForm").append(upquery);
	$("#MyUploadForm").attr("action", $.urlParam('cgi'));
	
	if ($.urlParam('filter') != undefined)
		if ($.urlParam('filter') != ""){
			defaultext  = $.urlParam('filter');
	}
	var h3 = "File Type allowed: '."+defaultext+"' | Maximum Size 30 MB";
	
	$("h3").text(h3);
	
	var options = { 
			//target:   '#output',   		// target element(s) to be updated with server response 
			beforeSubmit:	beforeSubmit,  	// pre-submit callback 
			uploadProgress:	OnProgress,
			success:		afterSuccess,  	// post-submit callback 
			error:			error,			
			resetForm: 		true        	// reset the form after successful submit 
		}; 
		
	$('#MyUploadForm').submit(function() {

        if(defaultext == "cfg")
        {
            if(GetLevel() == "Super Admin")
            {
                window.top.$( "#dialog" ).html("Do you want to Overwrite Factory Default?");
                window.top.$( "#dialog" ).dialog( {
                    autoOpen: false,
                    show: "fade",
                    hide: "fade",
                    modal: true,
                    minHeight: 150,
                    width: 400,
                    resizable: false,
                    title: "Upgrade Factory Default:",

                    buttons: { "Yes": function() { window.top.$("#dialog").dialog("close");
                                                   $("#MyUploadForm").append($("<input>").attr("type","hidden").attr("id","update_factory_default").attr("name","update_factory_default").attr("value","yes"));
                                                   $("#MyUploadForm").ajaxSubmit(options);
                                                   return false;
                                                 },
                               "No" : function() { window.top.$("#dialog").dialog("close");
                                                   $("#update_factory_default").remove();
                                                   $("#MyUploadForm").ajaxSubmit(options);
                                                   return false;
                                                 }
                              }
                });
                window.top.$(".ui-dialog-titlebar").css("background","#ff920a");								
                window.top.$("#dialog").dialog("open");
            }
            else
            {
                $(this).ajaxSubmit(options);
                return false;
                $("#update_factory_default").remove();
            }
        }
        else
        {
            $("#update_factory_default").remove();
            $(this).ajaxSubmit(options);
            return false;
        }
    });

function error (xhr, desc, err) {    
	$('#submit-btn').show(); //hide submit button
	$('#loading-img').hide(); //hide submit button
	$('#progressbox').hide();
	$("#output").html("<b>Upload Error:</b> " + err);
	$("#output").removeClass( "done" ).addClass( "fail" );
}
		
//when upload progresses	
function OnProgress(event, position, total, percentComplete){
	//Progress bar
	progressbar.width(percentComplete + '%') //update progressbar percent complete
	statustxt.html(percentComplete + '%'); //update status text
	if(percentComplete>50)
		statustxt.css('color','#fff'); //change status text to white after 50%
}

//after succesful upload
function afterSuccess(data) {
	$('#submit-btn').show(); //hide submit button
	$('#loading-img').hide(); //hide submit button
	$('#progressbox').hide();
	
	var x = JSON.parse(data);
	if (x.tag.toLowerCase() == "reply"){
		if (x.value.toLowerCase() == "ok"){
			$("#output").html("<b>Upload executed correctly!</b>");
			$("#output").removeClass( "fail" ).addClass( "done" );
			if ( defaultext  == "sh"){
				$('#upload-wrapper').find("input,button").prop("disabled",true);
				$('#upload-wrapper').delay(1000).fadeOut();
				$('#execution').delay(2000).fadeIn( "slow" );
				$('#execution .exec').click(function(){ executeCgi(x.execute)});
				$('#execution .cancel').click(function(){ CancelCgi(x.cancel)});
			}
			else
            {
				Reboot();
            }
		}
		else{
			$("#output").html("<b>Upload Failed!</b>");
			$("#output").removeClass( "done" ).addClass( "fail" );
		}
	}
}

//function to check file size before uploading.
function beforeSubmit(){
    //check whether browser fully supports all File API
    if (window.File && window.FileReader && window.FileList && window.Blob){
		//check empty input filed
		if( !$('#imageInput').val()){
			$("#output").html("No File selected!");
			return false
		}
		
		var fsize = $('#imageInput')[0].files[0].size; //get file size
		var extension =  $('#imageInput').val().split('.').pop();
		
		//allow only valid image file types 
		//console.debug(extension+" - "+defaultext);
		switch(extension){
            case defaultext:break;
            default:
                $("#output").html("<b>"+extension+"</b> Unsupported file type!");
				return false
        }
		
		//Allowed file size is less than 30 MB (31457280)
		if(fsize>31457280){
			$("#output").html("<b>"+bytesToSize(fsize) +"</b> Too big Image file!");
			return false
		}
		
		//Progress bar
		progressbox.show(); //show progressbar
		progressbar.width(completed); //initial value 0% of progressbar
		statustxt.html(completed); //set status text
		statustxt.css('color','#000'); //initial color of status text
	}			
		$('#submit-btn').hide(); //hide submit button
		$('#loading-img').show(); //hide submit button
		$("#output").html("");

	//}
	//else{
		//Output error to older unsupported browsers that doesn't support HTML5 File API
		//$("#output").html("Please upgrade your browser, because your current browser lacks some new features we need!");
		//return false;
	//}
}

//function to format bites bit.ly/19yoIPO
function bytesToSize(bytes) {
   var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   if (bytes == 0) return '0 Bytes';
   var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
   return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function executeCgi(query){
	$("#output").html("<i>Upgrade in progress! </i><b>Wait!</b>");
	$('#execution').empty();
	$.ajaxSetup({ cache: false });
	var exeCgi = "/cgi-bin/mpc105.cgi";
	if (query != "")
		exeCgi += '?'+query;
	
	var cl = new CanvasLoader('execution');
		cl.setColor('#00cc33'); // default is '#000000'
		cl.setShape('spiral'); // default is 'oval'
		cl.setDiameter(149); // default is 40
		cl.setDensity(132); // default is 40
		cl.setRange(0.8); // default is 1.3
		cl.setSpeed(3); // default is 2
		cl.setFPS(42); // default is 24
		cl.show(); // Hidden by default

	$.getJSON(exeCgi)
		.success(function(data){
					$('#execution').empty();
					if (data.value.toLowerCase() == "ok" ){
						Reboot();						
					}
					else{
						$("#output").html("<b>Upgrade Failed!</b>");			
						$("#output").removeClass( "done" ).addClass( "fail" );
					}
				})
		.error(function(jqXHR, textStatus, errorThrown) { //console.log(" error :" + textStatus);
		})
		.complete(function() { //console.log("complete");
		});
}

function CancelCgi(query){
	$.ajaxSetup({ cache: false });
	var exeCgi = "/cgi-bin/mpc105.cgi";
	if (query != "")
		exeCgi += '?'+query;
	$.getJSON(exeCgi, function(data) {
		//console.log(data);
        	location.reload(true);
	});
}

function Reboot(){
	window.top.$( "#dialog" ).html("Setting changed succesfully!<br>Device Required a Reboot. Execute it now?");
		window.top.$( "#dialog" ).dialog( {
				 autoOpen: false,
				 show: "fade",
				 hide: "fade",
				 modal: true,
				 minHeight: 150,
				 width: 400,
				 resizable: false,
				 title: "Upgrade Done!",
				 buttons: { "Yes": function() { window.top.$("#dialog").dialog("close"); window.top.location.href = "reboot.html?reboot="+$.urlParam("reboot");},
							"No" : function() { window.top.$("#dialog").dialog("close");}}
			});
		window.top.$(".ui-dialog-titlebar").css("background","#ff920a");								
		window.top.$("#dialog").dialog("open");
	}
}); 