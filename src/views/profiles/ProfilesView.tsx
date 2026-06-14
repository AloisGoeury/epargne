import { Download, Plus, Save, Upload, Users } from "lucide-react";
import { useState } from "react";
import { useI18n } from "../../i18n";
import type { AppProfile } from "../../types";

type ProfileCreatorState = {
  name: string;
  kind: "personal" | "shared";
  hideSavings: boolean;
  hideAccounts: boolean;
  memberIds: string[];
};

type ProfilesViewProps = {
  profiles: AppProfile[];
  activeProfileId: string;
  onActivateProfile: (profileId: string) => void;
  onCreateProfile: (profile: ProfileCreatorState) => void;
  onOpenDocument: () => void;
  onSaveDocument: () => void;
};

const defaultCreatorState: ProfileCreatorState = {
  name: "",
  kind: "personal",
  hideSavings: false,
  hideAccounts: false,
  memberIds: [],
};

export function ProfilesView({ profiles, activeProfileId, onActivateProfile, onCreateProfile, onOpenDocument, onSaveDocument }: ProfilesViewProps) {
  const { t } = useI18n();
  const [creator, setCreator] = useState<ProfileCreatorState>(defaultCreatorState);
  const personalProfiles = profiles.filter((profile) => profile.kind === "personal");
  const canCreate = creator.name.trim().length > 0 && (creator.kind === "personal" || creator.memberIds.length >= 2);

  const submit = () => {
    if (!canCreate) return;
    onCreateProfile(creator);
    setCreator(defaultCreatorState);
  };

  return (
    <main className="view">
      <div className="view-head">
        <div>
          <p className="eyebrow">{t("profile.eyebrow")}</p>
          <h1>{t("profile.title")}</h1>
        </div>
      </div>

      <div className="profile-layout">
        <section className="panel">
          <div className="panel-title">
            <h2>{t("profile.listTitle")}</h2>
            <Users size={19} aria-hidden="true" />
          </div>
          <div className="profile-card-list">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                className={`profile-card ${profile.id === activeProfileId ? "active" : ""}`}
                onClick={() => onActivateProfile(profile.id)}
              >
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.kind === "shared" ? t("profile.shared") : t("profile.personal")}</span>
                </div>
                <p>
                  {profile.preferences.hideSavings || profile.preferences.hideAccounts
                    ? t("profile.hiddenSummary")
                    : t("profile.visibleSummary")}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-title">
            <h2>{t("profile.createTitle")}</h2>
            <Plus size={19} aria-hidden="true" />
          </div>

          <div className="form-grid">
            <label className="field">
              <span>{t("profile.name")}</span>
              <input value={creator.name} onChange={(event) => setCreator((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="field">
              <span>{t("profile.type")}</span>
              <div className="segmented-control">
                <button
                  className={creator.kind === "personal" ? "active" : ""}
                  onClick={() => setCreator((current) => ({ ...current, kind: "personal" }))}
                  type="button"
                >
                  {t("profile.personal")}
                </button>
                <button
                  className={creator.kind === "shared" ? "active" : ""}
                  onClick={() => setCreator((current) => ({ ...current, kind: "shared", hideSavings: true, hideAccounts: true }))}
                  type="button"
                >
                  {t("profile.shared")}
                </button>
              </div>
            </label>
          </div>

          <div className="profile-options">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={creator.hideSavings}
                onChange={(event) => setCreator((current) => ({ ...current, hideSavings: event.target.checked }))}
              />
              <span>{t("profile.hideSavings")}</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={creator.hideAccounts}
                onChange={(event) => setCreator((current) => ({ ...current, hideAccounts: event.target.checked }))}
              />
              <span>{t("profile.hideAccounts")}</span>
            </label>
          </div>

          {creator.kind === "shared" ? (
            <div className="field">
              <span>{t("profile.members")}</span>
              <div className="checkbox-list">
                {personalProfiles.map((profile) => (
                  <label className="checkbox-row" key={profile.id}>
                    <input
                      type="checkbox"
                      checked={creator.memberIds.includes(profile.id)}
                      onChange={(event) =>
                        setCreator((current) => ({
                          ...current,
                          memberIds: event.target.checked
                            ? [...current.memberIds, profile.id]
                            : current.memberIds.filter((memberId) => memberId !== profile.id),
                        }))
                      }
                    />
                    <span>{profile.name}</span>
                  </label>
                ))}
              </div>
              <small className="field-help">{t("profile.membersHelp")}</small>
            </div>
          ) : null}

          <div className="profile-actions">
            <button className="action-button" onClick={submit} disabled={!canCreate}>
              <Plus size={16} aria-hidden="true" />
              <span>{t("profile.create")}</span>
            </button>
          </div>
        </section>
      </div>

      <section className="panel profile-storage-panel">
        <div className="panel-title">
          <h2>{t("profile.storageTitle")}</h2>
        </div>
        <div className="profile-storage-actions">
          <button className="action-button" onClick={onOpenDocument}>
            <Upload size={16} aria-hidden="true" />
            <span>{t("profile.importData")}</span>
          </button>
          <button className="action-button" onClick={onSaveDocument}>
            <Download size={16} aria-hidden="true" />
            <span>{t("profile.exportData")}</span>
          </button>
        </div>
        <p className="profile-storage-help">{t("profile.storageHelp")}</p>
      </section>
    </main>
  );
}
