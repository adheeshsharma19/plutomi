import get from "./getOpening";
import create from "./createOpening";
import remove from "./deleteOpening";
import getApplicants from "./getApplicantsInOpening";
import getStages from "./getStagesInOpening";
export const getOpeningById = get;
export const createOpening = create;
export const deleteOpening = remove;
export const getApplicantsInOpening = getApplicants;
export const getStagesInOpening = getStages;
