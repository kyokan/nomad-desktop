// @ts-ignore
import React, {ReactElement, useCallback, useEffect, useState} from "react";
// @ts-ignore
import {RouteComponentProps, withRouter} from "react-router-dom";
import "./profile-setting.scss";
import {useCurrentUsername, useFetchUser, useUser} from "../../ducks/users";
import {RawUserCard} from "../UserCard";
import {isSubdomain, parseUsername} from "../../utils/user";
import Button from "../Button";
import {useQueryMediaForName, useSendPost} from "../../ducks/posts";
import MediaPickerMenuable from "../../../electron/src/ui/components/MediaPickerMenuable";
import {createNewDraft} from "../../ducks/drafts/type";
type Props = {

} & RouteComponentProps;

function ProfileSetting(props: Props): ReactElement {
  const currentUsername = useCurrentUsername();
  const fetchUser = useFetchUser();
  const user = useUser(currentUsername);
  const { tld, subdomain } = parseUsername(currentUsername);
  const sendPost = useSendPost();
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const [defaultDisplayName, setDefaultDisplayName] = useState('');
  const [defaultBio, setDefaultBio] = useState('');
  const [defaultProfilePicture, setDefaultProfilePicture] = useState('');
  const [defaultCoverImage, setDefaultCoverImage] = useState('');
  const [defaultAvatarType, setDefaultAvatarType] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [avatarType, setAvatarType] = useState('');

  const hasChanged = defaultDisplayName !== displayName
    || defaultBio !== bio
    || defaultProfilePicture !== profilePicture
    || defaultCoverImage !== coverImage
    || defaultAvatarType !== avatarType;

  const submit = useCallback(async () => {
    if (sending || success) return;

    setSending(true);
    setErrorMessage('');

    try {
      if (defaultAvatarType !== avatarType) {
        await sendPost(createNewDraft({
          content: avatarType,
          topic: '.avatar_type',
        }));
        setDefaultAvatarType(avatarType);
      }

      if (defaultCoverImage !== coverImage) {
        await sendPost(createNewDraft({
          context: coverImage,
          topic: '.cover_image_refhash',
        }));
        setDefaultCoverImage(coverImage);
      }

      if (defaultDisplayName !== displayName) {
        await sendPost(createNewDraft({
          content: displayName,
          topic: '.display_name',
        }));
        setDefaultDisplayName(displayName);
      }

      if (defaultProfilePicture !== profilePicture) {
        await sendPost(createNewDraft({
          context: profilePicture,
          topic: '.profile_picture_refhash',
        }));
        setDefaultProfilePicture(profilePicture);
      }

      if (defaultBio !== bio) {
        await sendPost(createNewDraft({
          content: bio,
          topic: '.user_bio',
        }));
        setDefaultBio(bio);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 1000);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSending(false);
    }

  }, [
    defaultDisplayName,
    defaultBio,
    defaultProfilePicture,
    defaultCoverImage,
    defaultAvatarType,
    avatarType,
    displayName,
    bio,
    profilePicture,
    coverImage,
    sending,
    errorMessage,
    success,
  ]);

  useEffect(() => {
    if (currentUsername) {
      fetchUser(currentUsername);
    }
  }, [currentUsername, fetchUser]);

  useEffect(() => {
    setProfilePicture(user?.profilePicture || '');
    setCoverImage(user?.coverImage || '');
    setDisplayName(user?.displayName || subdomain || tld);
    setBio(user?.bio || '');
    setAvatarType(user?.avatarType || '');
    setDefaultAvatarType(user?.avatarType || '');
    setDefaultProfilePicture(user?.profilePicture || '');
    setDefaultCoverImage(user?.coverImage || '');
    setDefaultDisplayName(user?.displayName || subdomain || tld);
    setDefaultBio(user?.bio || '');
  }, [user?.profilePicture, user?.coverImage, user?.displayName, user?.bio, user?.avatarType, subdomain, tld]);

  const onSetAvatarType = useCallback(async (type: string) => {
    if (profilePicture) {
      setProfilePicture('');
    }

    setAvatarType(type)
  }, [profilePicture]);

  const queryMediaForName = useQueryMediaForName();

  return (
    <div className="profile-setting">
      <div className="setting__group">
        <div className="setting__group__title">
          Profile
        </div>
        <div className="setting__group__content">
          <div className="setting__group__content__row">
            <div className="setting__group__content__row__label">
              Display Name
            </div>
            <div className="setting__group__content__row__value">
              <input
                type="text"
                value={displayName}
                onChange={e => {
                  setDisplayName(e.target.value);
                  setErrorMessage('');
                }}
              />
            </div>
          </div>
          <div className="setting__group__content__row profile-setting__bio-row">
            <div className="setting__group__content__row__label">
              Bio
            </div>
            <div className="setting__group__content__row__value">
              <textarea
                cols={5}
                value={bio}
                onChange={e => {
                  setBio(e.target.value);
                  setErrorMessage('');
                }}
              />
            </div>
          </div>
          <div className="setting__group__content__row">
            <div className="setting__group__content__row__label">
              Profile Picture
            </div>
            <div className="setting__group__content__row__value">
              <div className="profile-setting__images">
                {
                  !isSubdomain(currentUsername) && (
                    <div className="profile-setting__images__group">
                      <div className="profile-setting__images__group__label">Cover Image</div>
                      <div className="profile-setting__images__group__actions">
                        <MediaPickerMenuable
                          onMediaUploadClick={() => null}
                          queryMediaByName={queryMediaForName}
                          onMediaHashUpdate={(hash: string) => {
                            setCoverImage(hash);
                            setErrorMessage('');
                          }}
                          items={[
                            {
                              text: 'Remove Profile Picture',
                              onClick: () => {
                                onSetAvatarType('_');
                                setErrorMessage('');
                              },
                            },
                          ]}
                        >
                          <Button>Choose File</Button>
                        </MediaPickerMenuable>
                      </div>
                    </div>
                  )
                }
                <div className="profile-setting__images__group">
                  <div className="profile-setting__images__group__actions">
                    <MediaPickerMenuable
                      onMediaUploadClick={() => null}
                      queryMediaByName={queryMediaForName}
                      onMediaHashUpdate={setProfilePicture}
                      items={[
                        {
                          text: 'Choose from Avatars',
                          items: [
                            {
                              text: 'gridy',
                              onClick: () => onSetAvatarType('gridy'),
                            },
                            {
                              text: 'bottts',
                              onClick: () => onSetAvatarType('bottts'),
                            },
                            {
                              text: 'avataaars',
                              onClick: () => onSetAvatarType('avataaars'),
                            },
                            {
                              text: 'jdenticon',
                              onClick: () => onSetAvatarType('jdenticon'),
                            },
                            {
                              text: 'identicon',
                              onClick: () => onSetAvatarType('identicon'),
                            },
                          ]
                        },
                        {
                          text: 'Remove Profile Picture',
                          onClick: () => onSetAvatarType('_'),
                        },
                      ]}
                    >
                      <Button>Choose File</Button>
                    </MediaPickerMenuable>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="setting__group__content__row profile-setting__preview-row">
            <RawUserCard
              alias={displayName}
              username={currentUsername}
              coverImageUrl={coverImage}
              profilePictureUrl={profilePicture}
              avatarType={avatarType}
              bio={bio}
            />
          </div>
        </div>
      </div>
      <div className="profile-setting__error-message">
        {errorMessage}
      </div>
      <div className="profile-setting__footer">
        <Button
          disabled={!hasChanged || sending || success}
          onClick={submit}
          color={success ? 'green' : 'default'}
        >
          Confirm
        </Button>
      </div>
    </div>
  );
}

export default withRouter(ProfileSetting);

function download(filename: string, fileType: string, text: string) {
  const blob = new Blob([text], { type: fileType });

  const a = document.createElement('a');
  a.download = filename;
  a.href = URL.createObjectURL(blob);
  a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}
