// @flow
import {
  channel_types,
  selectChannelById,
} from '@/components/PendingConnectionsScreens/channelSlice';
import { obtainKeys } from '@/utils/keychain';
import { hash } from '@/utils/encoding';
import { addConnection, addOperation } from '@/actions';
import { saveImage } from '@/utils/filesystem';
import { backupPhoto, backupUser } from '@/components/Recovery/helpers';
import {
  confirmPendingConnection,
  pendingConnection_states,
  selectPendingConnectionById,
  updatePendingConnection,
} from '@/components/PendingConnectionsScreens/pendingConnectionSlice';
import { leaveChannel } from '@/components/PendingConnectionsScreens/actions/channelThunks';
import {
  initiateConnectionRequest,
  respondToConnectionRequest,
} from '@/utils/connections';
import stringify from 'fast-json-stable-stringify';

export const confirmPendingConnectionThunk = (id: string) => async (
  dispatch: dispatch,
  getState: getState,
) => {
  const connection: PendingConnection = selectPendingConnectionById(
    getState(),
    id,
  );
  if (!connection) {
    throw new Error(`Can't confirm connection ${id} - Connection not found`);
  }
  // validate pendingConnection state
  if (connection.state !== pendingConnection_states.UNCONFIRMED) {
    console.log(`Can't confirm - Connection is in state ${connection.state}`);
    return;
  }

  dispatch(
    updatePendingConnection({
      id,
      changes: {
        state: pendingConnection_states.CONFIRMING,
      },
    }),
  );

  const channel = selectChannelById(getState(), connection.channelId);
  console.log(`confirming connection ${id} in channel ${channel.id}`);

  const {
    user: { backupCompleted },
  } = getState();

  let { username: myBrightId, secretKey } = await obtainKeys();
  let connectionTimestamp = Date.now();

  if (connection.initiator) {
    const { opName, opMessage } = await initiateConnectionRequest({
      connectionTimestamp,
      connection,
      secretKey,
      myBrightId,
      channel,
    });

    // Start listening for peer to complete connection operation
    console.log(`Responder opMessage: ${opMessage} - hash: ${hash(opMessage)}`);
    const op = {
      _key: hash(opMessage),
      name: opName,
      connectionTimestamp,
    };
    dispatch(addOperation(op));
  } else {
    if (connection.signedMessage) {
      // signedmessage from initiator is already available.
      await respondToConnectionRequest({
        otherBrightId: connection.brightId,
        signedMessage: connection.signedMessage,
        timestamp: connection.timestamp,
        myBrightId,
        secretKey,
      });
      if (channel.type === channel_types.SINGLE) {
        // Connection is established, so the 1:1 channel can be left
        dispatch(leaveChannel(channel.id));
      }
    } else {
      // signedMessage from initiator is still pending.
      // Remember that I want to confirm this connection. As soon as
      // the connectionRequest with signedMessage comes in, complete
      // the connection.
      dispatch(
        updatePendingConnection({
          id,
          changes: {
            wantsToConfirm: true,
          },
        }),
      );
    }
  }

  // save connection photo
  const filename = await saveImage({
    imageName: connection.brightId,
    base64Image: connection.photo,
  });

  // create established connection from pendingConnection
  const connectionData = {
    id: connection.brightId,
    name: connection.name,
    score: connection.score,
    connectionDate: connectionTimestamp,
    photo: { filename },
    status: 'initiated',
    notificationToken: connection.notificationToken,
    secretKey: connection.secretKey,
  };

  dispatch(addConnection(connectionData));
  dispatch(confirmPendingConnection(connection.id));

  if (backupCompleted) {
    await backupUser();
    await backupPhoto(connection.brightId, filename);
  }
};
