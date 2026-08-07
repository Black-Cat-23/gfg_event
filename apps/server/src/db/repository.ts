import { Event, Team, Activity, Submission, Score, LeaderboardRow } from '@recruitquest/types';
import path from 'path';
import fs from 'fs';

interface DbSchema {
  events: Record<string, Event>;
  teams: Record<string, Team>;
  activities: Record<string, Activity>;
  submissions: Record<string, Submission>; // key: `${activityId}_${teamId}`
  scores: Record<string, Score>;           // key: `${activityId}_${teamId}`
}

export class Repository {
  private dbPath: string;
  private data: DbSchema = {
    events: {},
    teams: {},
    activities: {},
    submissions: {},
    scores: {}
  };

  constructor() {
    const dbDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.dbPath = path.join(dbDir, 'event_db.json');
    this.loadDb();
  }

  private loadDb() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.events) this.data.events = {};
        if (!this.data.teams) this.data.teams = {};
        if (!this.data.activities) this.data.activities = {};
        if (!this.data.submissions) this.data.submissions = {};
        if (!this.data.scores) this.data.scores = {};
      } catch (err) {
        console.error('[Repository] Error reading DB file, starting fresh:', err);
      }
    } else {
      this.saveDb();
    }
  }

  private saveDb() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[Repository] Error saving DB file:', err);
    }
  }

  async resetEventData(eventId: string): Promise<void> {
    this.data.teams = {};
    this.data.submissions = {};
    this.data.scores = {};
    for (const act of Object.values(this.data.activities)) {
      if (act.eventId === eventId) {
        act.status = 'waiting';
        act.startedAt = undefined;
        act.endedAt = undefined;
      }
    }
    this.saveDb();
  }

  // Event
  async getEvent(id: string): Promise<Event | null> {
    return this.data.events[id] || null;
  }

  async createEvent(event: Event): Promise<void> {
    this.data.events[event.id] = { ...event };
    this.saveDb();
  }

  async updateEventStatus(id: string, status: Event['status']): Promise<void> {
    const ev = this.data.events[id];
    if (ev) {
      ev.status = status;
      if (status === 'running') ev.startedAt = new Date().toISOString();
      if (status === 'ended') ev.endedAt = new Date().toISOString();
      this.saveDb();
    }
  }

  async updateEventConfig(id: string, config: any): Promise<void> {
    const ev = this.data.events[id];
    if (ev) {
      ev.config = config;
      this.saveDb();
    }
  }

  // Team
  async getTeamByCode(code: string): Promise<Team | null> {
    const uppercaseCode = code.toUpperCase();
    return Object.values(this.data.teams).find(t => t.teamCode.toUpperCase() === uppercaseCode) || null;
  }

  async getTeamByName(eventId: string, name: string): Promise<Team | null> {
    const lowerName = name.toLowerCase();
    return Object.values(this.data.teams).find(t => t.eventId === eventId && t.name.toLowerCase() === lowerName) || null;
  }

  async createTeam(team: Team): Promise<void> {
    this.data.teams[team.id] = {
      ...team,
      totalScore: 0 // New teams start strictly at 0 pts
    };
    this.saveDb();
  }

  async updateTeamActiveConn(teamId: string, activeConn: string | null): Promise<void> {
    const team = this.data.teams[teamId];
    if (team) {
      team.activeConn = activeConn || undefined;
      this.saveDb();
    }
  }

  async listTeams(eventId: string): Promise<Team[]> {
    return Object.values(this.data.teams).filter(t => t.eventId === eventId);
  }

  async removeTeam(teamId: string): Promise<void> {
    delete this.data.teams[teamId];
    for (const key of Object.keys(this.data.submissions)) {
      if (this.data.submissions[key].teamId === teamId) {
        delete this.data.submissions[key];
      }
    }
    for (const key of Object.keys(this.data.scores)) {
      if (this.data.scores[key].teamId === teamId) {
        delete this.data.scores[key];
      }
    }
    this.saveDb();
  }

  // Activity
  async createActivity(act: Activity): Promise<void> {
    this.data.activities[act.id] = { ...act };
    this.saveDb();
  }

  async getActivity(id: string): Promise<Activity | null> {
    return this.data.activities[id] || null;
  }

  async listActivities(eventId: string): Promise<Activity[]> {
    return Object.values(this.data.activities)
      .filter(a => a.eventId === eventId)
      .sort((a, b) => a.seq - b.seq);
  }

  async updateActivityStatus(id: string, status: Activity['status']): Promise<void> {
    const act = this.data.activities[id];
    if (act) {
      act.status = status;
      if (status === 'running') act.startedAt = new Date().toISOString();
      if (status === 'completed' || status === 'scored') act.endedAt = new Date().toISOString();
      this.saveDb();
    }
  }

  // Submission
  async saveSubmission(submission: Submission): Promise<void> {
    const key = `${submission.activityId}_${submission.teamId}`;
    this.data.submissions[key] = { ...submission };
    this.saveDb();
  }

  async getSubmission(activityId: string, teamId: string): Promise<Submission | null> {
    const key = `${activityId}_${teamId}`;
    return this.data.submissions[key] || null;
  }

  async listSubmissions(activityId: string): Promise<Submission[]> {
    return Object.values(this.data.submissions).filter(s => s.activityId === activityId);
  }

  // Score & Leaderboard
  async saveScore(score: Score): Promise<void> {
    const key = `${score.activityId}_${score.teamId}`;
    this.data.scores[key] = { ...score };
    await this.recalculateTeamTotalScore(score.teamId);
    this.saveDb();
  }

  async saveOverallOverrideScore(teamId: string, value: number, note?: string): Promise<void> {
    const team = this.data.teams[teamId];
    if (team) {
      team.totalScore = value;
      this.saveDb();
    }
  }

  async recalculateTeamTotalScore(teamId: string): Promise<void> {
    const teamScores = Object.values(this.data.scores).filter(s => s.teamId === teamId);
    const sum = teamScores.reduce((acc, curr) => acc + curr.value, 0);
    const team = this.data.teams[teamId];
    if (team) {
      team.totalScore = sum;
    }
  }

  async getPerActivityLeaderboard(activityId: string): Promise<LeaderboardRow[]> {
    const act = await this.getActivity(activityId);
    const eventId = act ? act.eventId : 'default_event';
    const teams = await this.listTeams(eventId);

    const rows = teams.map(team => {
      const key = `${activityId}_${team.id}`;
      const scoreObj = this.data.scores[key];
      return {
        teamId: team.id,
        name: team.name,
        teamCode: team.teamCode,
        score: scoreObj ? scoreObj.value : 0
      };
    });

    rows.sort((a, b) => b.score - a.score);

    return rows.map((item, index) => ({
      rank: index + 1,
      teamId: item.teamId,
      name: item.name,
      teamCode: item.teamCode,
      score: item.score
    }));
  }

  async getOverallLeaderboard(eventId: string): Promise<LeaderboardRow[]> {
    const teams = await this.listTeams(eventId);
    teams.sort((a, b) => b.totalScore - a.totalScore);

    return teams.map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      name: team.name,
      teamCode: team.teamCode,
      score: team.totalScore,
      totalScore: team.totalScore
    }));
  }
}

export const repo = new Repository();
