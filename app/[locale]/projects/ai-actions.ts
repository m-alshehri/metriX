"use server";
import { queueProjectAction } from "./pipeline-actions";
export async function analyzeSentiment(form: FormData) {
  return queueProjectAction(form, "enrich");
}
