function goToSeed() {
	alert($("#nav_seed").val());
	var seed = $("#nav_seed").val();
	if (seed.match(/\w+/) && seed.length == 8) {
		window.location = "/session/" + seed;
	}
}

$("#nav_seed_button").click(goToSeed);
$("#nav_seed_form").submit(function(e) {
	e.preventDefault();
	goToSeed();
});