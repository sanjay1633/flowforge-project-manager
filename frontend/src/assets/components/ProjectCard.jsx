import { useMemo, useState } from "react";

const gitignoreOptions = ["No .gitignore", "Node", "Python", "React", "Flask"];
const licenseOptions = ["No license", "MIT License", "Apache License 2.0", "GNU GPLv3"];

function ProjectCard({ formData, isSubmitting, onFieldChange, onSubmit, user }) {
  const [visibility, setVisibility] = useState("public");
  const [addReadme, setAddReadme] = useState(false);
  const [gitignore, setGitignore] = useState(gitignoreOptions[0]);
  const [license, setLicense] = useState(licenseOptions[0]);

  const projectTitle = formData.title || "";
  const projectDescription = formData.description || "";
  const descriptionLength = projectDescription.length;
  const ownerName = user?.name || "Owner";
  const ownerInitial = ownerName.trim().charAt(0).toUpperCase() || "O";

  const projectSlug = useMemo(() => {
    return projectTitle.trim().toLowerCase().replace(/\s+/g, "-");
  }, [projectTitle]);

  const handleChange = (event) => {
    onFieldChange(event.target.name, event.target.value);
  };

  return (
    <section className="repo-create-panel" aria-labelledby="create-project-heading">
      <form className="repo-setup-form" onSubmit={onSubmit}>
        <div className="setup-step">
          <span className="step-marker">1</span>
          <div className="step-content">
            <h2 id="create-project-heading">General</h2>
            <div className="repo-name-row">
              <label className="owner-field">
                Owner *
                <button className="owner-select" type="button" aria-label={`Owner ${ownerName}`}>
                  <span className="owner-avatar">{ownerInitial}</span>
                  <span>{ownerName}</span>
                  <span className="select-caret" aria-hidden="true" />
                </button>
              </label>
              <span className="repo-slash" aria-hidden="true">/</span>
              <label className="repo-name-field">
                Repository name *
                <input
                  name="title"
                  value={projectTitle}
                  onChange={handleChange}
                  placeholder="flow"
                  required
                />
              </label>
            </div>
            {projectSlug && (
              <p className="availability-message">
                <span className="check-dot" aria-hidden="true" />
                {projectSlug} is available.
              </p>
            )}
            <p className="repo-name-hint">
              Great project names are short and memorable. How about{" "}
              <button type="button" onClick={() => onFieldChange("title", "scaling-disco")}>
                scaling-disco
              </button>
              ?
            </p>
            <label className="repo-description-field">
              Description
              <textarea
                maxLength="350"
                name="description"
                value={projectDescription}
                onChange={handleChange}
                rows="2"
              />
            </label>
            <span className="character-count">{descriptionLength} / 350 characters</span>
          </div>
        </div>

        <div className="setup-step">
          <span className="step-marker">2</span>
          <div className="step-content">
            <h2>Configuration</h2>
            <div className="config-card">
              <div className="config-row visibility-row">
                <div>
                  <strong>Choose visibility *</strong>
                  <span>Choose who can see and commit to this project</span>
                </div>
                <div className="visibility-toggle" aria-label="Project visibility">
                  {["public", "private"].map((option) => (
                    <button
                      className={visibility === option ? "active" : ""}
                      key={option}
                      type="button"
                      onClick={() => setVisibility(option)}
                    >
                      {option === "public" ? "Public" : "Private"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="config-card">
              <div className="config-row schedule-row">
                <div>
                  <strong>Project schedule</strong>
                  <span>Set the project start and deadline dates</span>
                </div>
                <div className="schedule-inputs">
                  <label>
                    Start
                    <input
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleChange}
                    />
                  </label>
                  <label>
                    Deadline
                    <input
                      name="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </div>
              <div className="config-row">
                <div>
                  <strong>Add README</strong>
                  <span>READMEs can be used as longer project descriptions.</span>
                </div>
                <button
                  className={`switch-button ${addReadme ? "on" : ""}`}
                  type="button"
                  aria-pressed={addReadme}
                  onClick={() => setAddReadme((current) => !current)}
                >
                  <span>{addReadme ? "On" : "Off"}</span>
                  <span className="switch-track" aria-hidden="true">
                    <span />
                  </span>
                </button>
              </div>
              <div className="config-row">
                <div>
                  <strong>Add .gitignore</strong>
                  <span>.gitignore tells git which files not to track.</span>
                </div>
                <select value={gitignore} onChange={(event) => setGitignore(event.target.value)}>
                  {gitignoreOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="config-row">
                <div>
                  <strong>Add license</strong>
                  <span>Licenses explain how others can use your code.</span>
                </div>
                <select value={license} onChange={(event) => setLicense(event.target.value)}>
                  {licenseOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <button className="create-repo-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create project"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

export default ProjectCard;
