var stateCache = {}

function validateState(e) {
	var $target = $(e.target);
	var prevVal = stateCache[$target.attr('id')];
	
	stateCache[$target.attr('id')] = getValue($target);
	
	for (var i = 0; i < invalidsets.length; i++) {
		if(! ($target.attr('id') in invalidsets[i]))
			continue;
		
		var invalid = true;
		var invalids = {}
		
		for (var input in invalidsets[i]) {
			if (input == "reason")
				continue;
			invalid = invalid && invalidsets[i][input].indexOf(stateCache[input]) != -1;
			
			invalids[input] = invalidsets[i][input].indexOf(stateCache[input]) != -1;
		}
		
		// console.log(invalidsets[i], stateCache, invalids);
		
		if (invalid) {
			$(".alert-danger .alert-text").html("<strong>Input error!</strong> " + invalidsets[i]["reason"]);
			$(".alert-danger").alert(200, 2000, 100);
			setValue($target, prevVal);
			stateCache[$target.attr('id')] = prevVal;
			return;
		}
	}
	
	if (isCheckbox($target))
		changeCheckImage($target);
}

function getValue($input) {
	if (isCheckbox($input))
		return $input.is(':checked');
	return $input.val();
}

function setValue($input, val) {
	if (isCheckbox($input))
		$input.prop('checked', val)
	else
		$input.val(val);
}

function isCheckbox($target) {
	return $target.prop("tagName") == "INPUT" && $target.attr("type") == "checkbox";
}

function changeCheckImage(target) {
	var id = target.attr('id');
	$('#check_' + id).attr('src', '/bingo/img/ready_' + (target.prop('checked') ? 'true' : 'false') + '.png');
}

function showHow() {
	$("#bingo_info").hide();
	$("#antibingo_info").hide();
	$("#64_info").hide();
	if ($("#gametype").val() == "64")
		$("#64_info").show();
	else if ($("#antibingo").is(':checked'))
		$("#antibingo_info").show();
	else
		$("#bingo_info").show();
}

$(document).on('ready', function() {
	showHow();
	$('.session').each(function(no,target) {
		stateCache[$(target).attr('id')] = getValue($(target));
	})
	
	if (error == "nobingo") {
		$(".alert-danger .alert-text").html("<strong>Bingo error!</strong> Too few parameters!");
		$(".alert-danger").alert(200, 2000, 100);
	} else if (error == "rando") {
		$(".alert-danger .alert-text").html("<strong>Bingo error!</strong> Randomizer link invalid!");
		$(".alert-danger").alert(200, 2000, 100);
	}

	var $size = $('#size'),
	    $bingo_count_type = $('#bingo_count_type'),
		$bingo_count = $("#bingo_count"),
		$hub = $("#hub"),
		$goal_count = $("#goal_count");
		
	function validateNumber() {
		var size = $size.val(),
		    type = $bingo_count_type.val();
			
		for(var i = 0; i < 25; i++) {
			$("#bingo_count").find(".option" + (i+1)).show();
		}
			
		var max = 0;
		if(size == "3" && type == "bingo")
			max = 6;
		if(size == "3" && type == "goal")
			max = 9;
		if(size == "4" && type == "bingo")
			max = 8;
		if(size == "4" && type == "goal")
			max = 16;
		if(size == "5" && type == "bingo")
			max = 10;
		if(size == "5" && type == "goal")
			max = 25;
			
		for(var i = max; i < 25; i++) {
			$("#bingo_count").find(".option" + (i+1)).hide();
		}
		
		if ($bingo_count.val() > max)
			$bingo_count.val("1");

	}
		
	function validateLockoutNumber() {
		for(var i = 0; i < 33; i++) {
			$("#goal_count").find(".option" + (i+1)).show();
		}

		var max = $hub.val() == "All" ? 33 : 9;
			
		for(var i = max; i < 33; i++) {
			$("#goal_count").find(".option" + (i+1)).hide();
		}
		
		if ($goal_count.val() > max)
			$goal_count.val("1");
	}
	
	$('.session').on('change', validateState);
	$size.on('change', validateNumber);
	$bingo_count_type.on('change', validateNumber);
	$hub.on('change', validateLockoutNumber);

	$('#gametype').on('change', function() {
		if ($(this).val() == "bingo") {
			$('#bingo_options').show();
			$('#64_options').hide();
			$('#goal_options').show();
		} else {
			$('#bingo_options').hide();
			$('#64_options').show();
			$('#goal_options').hide();
		}
		showHow();
	});
	$('#win_type').on('change', function() {
		if ($(this).val() == "goal")
			$('#required_goals').show();
		else
			$('#required_goals').hide();
	});
	$('#antibingo').on('change', function() {
		showHow();
	});
	
	validateNumber();
	validateLockoutNumber();
	
	$('#generate').on('click', function() {
		var payload = {}
		$('input.session').each(function() {
			payload[$(this).attr('id')] = $(this).is(':checked');
		});
		$('input.form-inline').each(function() {
			payload[$(this).attr('id')] = $(this).val();
		});	
		$('.session').each(function() {
			if(!($(this).attr('id') in payload))
				payload[$(this).attr('id')] = $(this).val();
		});	
		window.location = "/bingo/session?" + $.param(payload) 
	});
});