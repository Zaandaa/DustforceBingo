

function accessGimmick(replay, gimmick) {
	if (gimmick == "lowpercent") {
		return replay.meta.tags.collected;
	} else if (gimmick == "lowattack") {
		if (replay.meta.input_super > 0) {
			return -1; // invalid
		} else {
			return replay.meta.input_lights + 3 * replay.meta.input_heavies;
		}
	} else {
		return replay.meta[meta.gimmicks[gimmick].accessor];
	}
}

function betterGimmick(gimmick, g1, g2) {
	if (gimmick == "apples") {
		return Math.max(g1, g2);
	} else {
		// ignore invalid negatives
		// both could be negative, something else handles that
		if (g1 < 0) {
			return g2;
		} else if (g2 < 0) {
			return g1;
		}
		return Math.min(g1, g2);
	}
}

function meetGoalGimmick(replay, gimmick, goalRequirement) {
	if (gimmick == "apples") {
		return accessGimmick(replay, gimmick) >= goalRequirement;
	} else if (gimmick == "lowattack") {
		if (replay.meta.input_super > 0) {
			return false;
		} else {
			return accessGimmick(replay, gimmick) <= goalRequirement;
		}
	} else {
		return accessGimmick(replay, gimmick) <= goalRequirement;
	}
}
