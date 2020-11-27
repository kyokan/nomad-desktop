import React, {ReactElement, useCallback, useEffect, useState} from "react";
import {RouteComponentProps, withRouter} from "react-router-dom";
import "./profile-setting.scss";
import {useCurrentUsername, useFetchUser, useUser} from "nomad-universal/lib/ducks/users";
import {RawUserCard} from "nomad-universal/lib/components/UserCard";
import {parseUsername} from "nomad-universal/lib/utils/user";
import Button from "nomad-universal/lib/components/Button";
import {useFileUpload, useQueryMediaForName} from "../../../helpers/hooks";
import {postIPCMain} from "../../../helpers/ipc";
import {IPCMessageRequestType} from "../../../../app/types";
import {createNewDraft} from "nomad-universal/lib/ducks/drafts/type";
import Menuable from "nomad-universal/lib/components/Menuable";
type Props = {

} & RouteComponentProps;

function ProfileSetting(props: Props): ReactElement {
  const currentUsername = useCurrentUsername();
  const fetchUser = useFetchUser();
  const user = useUser(currentUsername);
  const { tld, subdomain } = parseUsername(currentUsername);

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
  const fileUpload = useFileUpload();

  const hasChanged = defaultDisplayName !== displayName
    || defaultBio !== bio
    || defaultProfilePicture !== profilePicture
    || defaultCoverImage !== coverImage
    || defaultAvatarType !== avatarType;

  const submit = useCallback(async () => {
    if (defaultAvatarType !== avatarType) {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_NEW_POST,
        payload: {
          draft: createNewDraft({
            content: avatarType,
            topic: '.avatar_type',
          }),
          truncate: false,
        },
      }, true);
      setDefaultAvatarType(avatarType);
    }

    if (defaultCoverImage !== coverImage) {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_NEW_POST,
        payload: {
          draft: createNewDraft({
            context: coverImage,
            topic: '.cover_image_refhash',
          }),
          truncate: false,
        },
      }, true);
      setDefaultCoverImage(coverImage);
    }

    if (defaultDisplayName !== displayName) {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_NEW_POST,
        payload: {
          draft: createNewDraft({
            content: displayName,
            topic: '.display_name',
          }),
          truncate: false,
        },
      }, true);
      setDefaultDisplayName(displayName);
    }

    if (defaultProfilePicture !== profilePicture) {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_NEW_POST,
        payload: {
          draft: createNewDraft({
            context: profilePicture,
            topic: '.profile_picture_refhash',
          }),
          truncate: false,
        },
      }, true);
      setDefaultProfilePicture(profilePicture);
    }

    if (defaultBio !== bio) {
      await postIPCMain({
        type: IPCMessageRequestType.SEND_NEW_POST,
        payload: {
          draft: createNewDraft({
            content: bio,
            topic: '.user_bio',
          }),
          truncate: false,
        },
      }, true);
      setDefaultBio(bio);
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
  ]);

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

  const onUploadCoverImage = useCallback(async () => {
    const hash = await fileUpload();
    setCoverImage(hash);
    return hash;
  }, [fileUpload]);

  const onUploadProfilePicture = useCallback(async () => {
    const hash = await fileUpload();
    setProfilePicture(hash);
    return hash;
  }, [fileUpload]);

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
                onChange={e => setDisplayName(e.target.value)}
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
                onChange={e => setBio(e.target.value)}
              />
            </div>
          </div>
          <div className="setting__group__content__row profile-setting__bio-row">
            <div className="setting__group__content__row__label">
              <RawUserCard
                alias={displayName}
                username={currentUsername}
                coverImageUrl={coverImage}
                profilePictureUrl={profilePicture}
                avatarType={avatarType}
                bio={bio}
              />
            </div>
            <div className="profile-setting__images">
              <div className="profile-setting__images__group">
                <div className="profile-setting__images__group__label">Profile Picture</div>
                <div className="profile-setting__images__group__actions">
                  {(
                    <Menuable
                      className=""
                      items={[
                        {
                          text: 'Choose from Avatars',
                          items: [
                            {
                              text: 'identicon',
                              onClick: () => onSetAvatarType('identicon'),
                            },
                            {
                              text: 'jdenticon',
                              onClick: () => onSetAvatarType('jdenticon'),
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
                    </Menuable>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="profile-setting__footer">
        <Button
          disabled={!hasChanged}
          onClick={submit}
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
