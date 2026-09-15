import fs from "node:fs";

const file = "app/dev/missions.ts";
const action = process.argv[2];
const missionId = Number(process.argv[3]);

if (!["complete", "reopen"].includes(action) || !Number.isInteger(missionId)) {
  console.error(
    "Usage: npm run mission:complete -- <id> or npm run mission:reopen -- <id>"
  );
  process.exit(1);
}

let source = fs.readFileSync(file, "utf8");

const missionPattern = new RegExp(
  `(id:\\s*${missionId},[\\s\\S]*?status:\\s*")[^"]+(")`
);

if (!missionPattern.test(source)) {
  console.error(`Mission ${missionId} was not found.`);
  process.exit(1);
}

if (action === "complete") {
  source = source.replace(missionPattern, `$1complete$2`);

  const nextPattern = new RegExp(
    `(id:\\s*${missionId + 1},[\\s\\S]*?status:\\s*")[^"]+(")`
  );

  if (nextPattern.test(source)) {
    source = source.replace(nextPattern, `$1in-progress$2`);
  }
} else {
  source = source.replace(missionPattern, `$1in-progress$2`);
}

fs.writeFileSync(file, source);

console.log(
  action === "complete"
    ? `Mission ${missionId} completed. Mission ${missionId + 1} is now in progress.`
    : `Mission ${missionId} reopened.`
);
