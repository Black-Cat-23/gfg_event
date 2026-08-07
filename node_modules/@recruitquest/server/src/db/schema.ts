import { Event, Team, Activity, Submission, Score } from '@recruitquest/types';

export interface DbEvent extends Event {}
export interface DbTeam extends Team {}
export interface DbActivity extends Activity {}
export interface DbSubmission extends Submission {}
export interface DbScore extends Score {}
