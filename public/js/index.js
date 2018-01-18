function changeCheckImage() {
	var id = $(this).attr('id');
	$('#check_' + id).attr('src', '/bingo/img/ready_' + ($(this).prop('checked') ? 'true' : 'false') + '.png');
}

$(document).on('ready', function() {
	console.log(error);
	if (error == "nobingo") {
		$(".alert-danger .alert-text").html("<strong>Bingo error!</strong> Too few parameters!");
		$(".alert-danger").alert(200, 2000, 100);
	}

	var $size = $('#size'),
	    $bingo_count_type = $('#bingo_count_type'),
		$bingo_count = $("#bingo_count");
	function validateNumber() {
		var size = $size.val(),
		    type = $bingo_count_type.val();
			
		for(var i = 0; i < 25; i++) {
			$(".option" + (i+1)).show();
		}
			
		var max = 0;
		if(size == "3" && type == "bingo")
			max = 6;
		if(size == "3" && type == "goal")
			max = 9;
		if(size == "5" && type == "bingo")
			max = 10;
		if(size == "5" && type == "goal")
			max = 25;
			
		for(var i = max; i < 25; i++) {
			$(".option" + (i+1)).hide();
		}
		
		$bingo_count.val("1");
	}		
	
	$('input[type=checkbox]').on('change', changeCheckImage)
	$size.on('change', validateNumber);
	$bingo_count_type.on('change', validateNumber);
	
	validateNumber();
	
	$('#generate').on('click', function() {
		var payload = {}
		$('input.session').each(function() {
			payload[$(this).attr('id')] = $(this).is(':checked');
		});	
		
		$('.session').each(function() {
			if(!($(this).attr('id') in payload))
				payload[$(this).attr('id')] = $(this).val();
		});	
		window.location = "/bingo/session?" + $.param(payload) 
	});
});