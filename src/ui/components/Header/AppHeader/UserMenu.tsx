import React, {MouseEvent, ReactElement, useCallback, useState} from "react";
import Menuable, {MenuProps} from "../../Menuable";
import HeaderButton from "../../HeaderButton";
import UserIcon from "../../../../../static/assets/icons/user.svg";
import {setCurrentUser, useIdentities, useIdentity} from "../../../ducks/users";
import TickIcon from "../../../../../static/assets/icons/tick.svg";
import PlusIcon from "../../../../../static/assets/icons/plus.svg";
import UploadIcon from "../../../../../static/assets/icons/upload.svg";
import {postIPCMain} from "../../../helpers/ipc";
import {IPCMessageRequestType, IPCMessageResponse} from "../../../../app/types";
import {useDispatch} from "react-redux";
import {RouteComponentProps, withRouter} from "react-router";
import {dotName, isSubdomain, isTLD, undotName} from "../../../helpers/user";
import {addSystemMessage} from "../../../ducks/app";
import {remote} from "electron";
import fs from "fs";
import {decrypt} from "../../../../app/util/key";
import {useCurrentUsername, useUser} from "nomad-universal/lib/ducks/users";
import {getImageURLFromPostHash} from "nomad-universal/lib/utils/posts";

function UserMenu(props: RouteComponentProps): ReactElement {
  const { identities } = useIdentity();
  const currentUsername = useCurrentUsername();
  const user = useUser(currentUsername);

  return (
    <Menuable
      className="user-menu"
      items={getUsersMenuItems(props)}
    >
      <HeaderButton
        iconUrl={user?.profilePicture ? getImageURLFromPostHash(user.profilePicture) : UserIcon}
        showCaret
      >
        {
          currentUsername
            ? undotName(currentUsername)
            : Object.keys(identities).length
              ? 'Select User'
              : 'No User'
        }
      </HeaderButton>
    </Menuable>
  );
}

export default withRouter(UserMenu);

function getUsersMenuItems(props: RouteComponentProps): (MenuProps | null)[] {
  const dispatch = useDispatch();
  const { identities } = useIdentity();
  const users = Object.keys(identities);
  const [isImporting, setImporting] = useState(false);
  const [editingName, setEditingName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [importTLD, setImportTLD] = useState('');
  const [keystore, setKeystore] = useState('');
  const currentUser = useCurrentUsername();

  const selectUser = useCallback(async () => {
    try {
      await dispatch(setCurrentUser(editingName, password));
      setEditingName('');
      setPassword('');
      setImporting(false);
    } catch (e) {
      dispatch(addSystemMessage({
        text: e.message,
        type: "error"
      }));
    }
  }, [editingName, password]);

  const passwordInputRenderFn = useCallback(() => (
    <div
      key={`login-pw-input`}
      className="app-header__password-input__container"
      onClick={(e => e.stopPropagation())}
    >
      <input
        className="app-header__password-input"
        type="password"
        value={password}
        placeholder="Password"
        onChange={e => setPassword(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && selectUser()}
        autoFocus
      />
      <div className="app-header__password-input__actions">
        <button
          className="button"
          onClick={() => {
            setEditingName('');
            setPassword('');
          }}
        >
          Back
        </button>
        <button
          className="button"
          onClick={async () => {
            await selectUser();
          }}
          disabled={!password}
        >
          { isSubdomain(editingName) ? 'Login' : 'Unlock' }
        </button>
      </div>

    </div>
  ), [editingName, importTLD, password, selectUser]);

  const importInputGroupRenderFn = useCallback(() => (
    <div
      key={`login-pw-input`}
      className="app-header__password-input__container"
      onClick={(e => e.stopPropagation())}
    >
      <div>
        <input
          className="app-header__password-input"
          type="text"
          value={importTLD}
          placeholder="TLD"
          onChange={e => setImportTLD(e.target.value.replace(/\./g, ''))}
          // onKeyPress={e => e.key === 'Enter' && selectUser()}
          autoFocus
        />
      </div>
      <div>
        <input
          className="app-header__password-input"
          type="password"
          value={password}
          placeholder="Password"
          onChange={e => setPassword(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && selectUser()}
        />
      </div>

      <div className="app-header__password-input__actions">
        <button
          className="button"
          onClick={() => {
            setImporting(false);
            setImportTLD('');
            setPassword('');
          }}
        >
          Back
        </button>
        <button
          className="button"
          onClick={async () => {
            try {
              const pk = decrypt(keystore, password);

              if (!pk  || pk.length < 64) {
                throw new Error('Cannot decrypt keystore');
              } else {
                const resp: IPCMessageResponse<any> = await postIPCMain({
                  type: IPCMessageRequestType.ADD_TLD_IDENTITY,
                  payload: {
                    tld: dotName(importTLD),
                    privateKey: pk,
                    password,
                  },
                }, true);

                if (!resp.error) {
                  setImporting(false);
                  setImportTLD('');
                  setPassword('');
                }
              }
            } catch (e) {
              dispatch(addSystemMessage({
                type: 'error',
                text: e.message,
              }))
            }
          }}
          disabled={!password}
        >
          { isSubdomain(editingName) ? 'Login' : 'Unlock' }
        </button>
      </div>

    </div>
  ), [editingName, importTLD, password, selectUser]);

  const addUserMenuItem = {
    text: 'Add User',
    iconUrl: PlusIcon,
    onClick: () => postIPCMain({ type: IPCMessageRequestType.OPEN_NEW_USER_WINDOW, payload: null }),
  };

  const importTLDMenuItem = {
    text: 'Import Keystore',
    iconUrl: UploadIcon,
    onClick: useCallback(async (e) => {
      e.stopPropagation();

      const {
        filePaths: [filePath],
      } = await remote.dialog.showOpenDialog({
        filters: [
          { name: 'All', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });
      const file = await fs.promises.readFile(filePath);
      setImporting(true);
      setKeystore(file.toString('utf-8'));
    }, [remote, setImporting]),
  };

  if (isImporting) {
    return [
      {
        forceRender: importInputGroupRenderFn,
      }
    ]
  }

  if (editingName) {
    return [
      {
        forceRender: passwordInputRenderFn,
      }
    ]
  }

  const items = users
    .sort((a, b) => {
      if (isSubdomain(a) && isTLD(b)) {
        return 1;
      }

      if (isTLD(a) && isSubdomain(b)) {
        return -1;
      }

      return a > b ?  1 : -1;
    })
    .map(name => ({
      text: name.split('.')[0],
      iconUrl: name === currentUser ? TickIcon : '',
      selected: name === currentUser,
      onClick: (e: any) => {
        if (e.stopPropagation) e.stopPropagation();
        if (name !== currentUser) {
          setEditingName(name);
        }
      },
    }));

  if (!currentUser && users.length) {
    return [
      ...items,
      { divider: true },
      importTLDMenuItem,
      addUserMenuItem,
    ]
  }

  if (!currentUser && !users.length) {
    return [
      importTLDMenuItem,
      addUserMenuItem,
    ];
  }

  return [
    {
      text: `Current User: ${currentUser.split('.')[0]}`,
      items: items,
      onClick: (e: MouseEvent) => e.stopPropagation(),
    },
    { divider: true },
    {
      text: 'Go to Profile',
      onClick: () => {
        props.history.push(`/users/${currentUser}/timeline`);
      },
    },
    {
      text: 'Download Keystore',
      onClick: (e: any) => {
        if (e.stopPropagation) e.stopPropagation();
        postIPCMain({
          type: IPCMessageRequestType.GET_USER_KEYSTORE,
          payload: currentUser,
        }, true)
          .then(resp => {
            const element = document.createElement('a');
            element.setAttribute(
              'href',
              'data:text/plain;charset=utf-8,' + encodeURIComponent(resp.payload)
            );
            element.setAttribute('download', currentUser);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
          });
      },
    },
    { divider: true },
    importTLDMenuItem,
    addUserMenuItem,
  ];
}

