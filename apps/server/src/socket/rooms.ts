export const getAdminRoom = (eventId: string) => `event:${eventId}:admin`;
export const getTeamRoom = (eventId: string) => `event:${eventId}:team`;
export const getPrivateTeamRoom = (teamId: string) => `team:${teamId}`;
export const getEventRoom = (eventId: string) => `event:${eventId}`;
