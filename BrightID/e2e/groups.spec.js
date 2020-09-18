/* global device:false, element:false, by:false, waitFor:false */

import {
  createBrightID,
  createFakeConnection,
  expectGroupsScreen,
  navigateHome,
} from './testUtils';

/*
  Limitations:
  - All group tests are from group creator/admin perspective. There is no test
    for the "being invited" flow.
  - Inviting additional connections to a group is not tested (Can we get a fake connection
    being eligible to be invited?)
  - Group search is not tested against member name matches, as member names are random
 */

const firstGroupName = 'Reservoir Dogs';
const secondGroupName = 'Inglourious Basterds';

describe('Groups', () => {
  let hasBackButton = true;
  let cancelText = 'CANCEL';

  beforeAll(async () => {
    const platform = await device.getPlatform();
    hasBackButton = platform === 'android';
    cancelText = hasBackButton ? 'CANCEL' : 'Cancel';
    // create identity
    await createBrightID();
  });

  xdescribe('Show initial group screen', () => {
    beforeAll(async () => {
      // make sure to be on the groups screen before starting tests
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
    });

    afterAll(async () => {
      await navigateHome();
    });

    it('should show "noGroups" screen', async () => {
      await expect(element(by.id('noGroupsView'))).toBeVisible();
      await expect(element(by.id('groupsLearnMoreBtn'))).toBeVisible();
      await expect(element(by.id('groupsCreateGroupBtn'))).toBeVisible();
    });

    it('should show group creation screen and go back (backbutton)', async () => {
      if (!hasBackButton) return;

      await element(by.id('groupsCreateGroupBtn')).tap();
      await expect(element(by.id('groupInfoScreen'))).toBeVisible();
      await device.pressBack();
      await expect(element(by.id('noGroupsView'))).toBeVisible();
    });

    it('should show group creation screen and go back', async () => {
      await element(by.id('groupsCreateGroupBtn')).tap();
      await expect(element(by.id('groupInfoScreen'))).toBeVisible();
      await element(by.id('header-back')).tap();
      // header-back button takes 1-2 seconds to complete switch, so use waitFor() here
      await waitFor(element(by.id('noGroupsView')))
        .toBeVisible()
        .withTimeout(20000);
    });
  });

  describe('Create initial group', () => {
    beforeAll(async () => {
      // create 3 fake connections
      for (let i of [1, 2, 3]) {
        await createFakeConnection();
      }

      // navigate to group creation screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      await element(by.id('groupsCreateGroupBtn')).tap();
      await expect(element(by.id('groupInfoScreen'))).toBeVisible();
    });

    afterAll(async () => {
      await navigateHome();
    });

    it('should set group info', async () => {
      await element(by.id('editGroupName')).tap();
      await element(by.id('editGroupName')).typeText(firstGroupName);
      await element(by.id('editGroupName')).tapReturnKey();
      await expect(element(by.id('editGroupName'))).toHaveText(firstGroupName);
      await element(by.id('editGroupPhoto')).tap();
    });

    it('should set group Co-Founders', async () => {
      // proceed to next screen
      await expect(element(by.id('nextBtn'))).toBeVisible();
      await element(by.id('nextBtn')).tap();
      await expect(element(by.id('newGroupScreen'))).toBeVisible();
      // make the first 2 available connections co-founder
      await waitFor(element(by.id('checkCoFounderBtn')).atIndex(0))
        .toExist()
        .withTimeout(20000);
      await element(by.id('checkCoFounderBtn')).atIndex(0).tap();
      await element(by.id('checkCoFounderBtn')).atIndex(1).tap();
    });

    it('should create group', async () => {
      await element(by.id('createNewGroupBtn')).tap();
      await expect(element(by.id('createNewGroupBtn'))).toBeNotVisible();
      // if group was created successfully we should be back at the Groups screen
      await expectGroupsScreen();
      // there should be exactly one group now
      await expect(element(by.id('groupItem-0'))).toBeVisible();
      await expect(element(by.id('groupName'))).toHaveText(firstGroupName);
    });
  });

  describe('Create additional group', () => {
    beforeAll(async () => {
      // navigate to group creation screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // there should be at least one group existing
      await expect(element(by.id('groupItem-0'))).toBeVisible();
      // add group
      await element(by.id('addGroupBtn')).tap();
      await expect(element(by.id('groupInfoScreen'))).toBeVisible();
    });

    afterAll(async () => {
      await navigateHome();
    });

    it('should set group info', async () => {
      await element(by.id('editGroupName')).tap();
      await element(by.id('editGroupName')).typeText(secondGroupName);
      await element(by.id('editGroupName')).tapReturnKey();
      await expect(element(by.id('editGroupName'))).toHaveText(secondGroupName);
      await element(by.id('editGroupPhoto')).tap();
    });

    it('should set group Co-Founders', async () => {
      // proceed to next screen
      await expect(element(by.id('nextBtn'))).toBeVisible();
      await element(by.id('nextBtn')).tap();
      await expect(element(by.id('newGroupScreen'))).toBeVisible();
      // make the 2nd and third available connections co-founder
      await waitFor(element(by.id('checkCoFounderBtn')).atIndex(1))
        .toExist()
        .withTimeout(20000);
      await element(by.id('checkCoFounderBtn')).atIndex(1).tap();
      await element(by.id('checkCoFounderBtn')).atIndex(2).tap();
    });

    it('should create group', async () => {
      await element(by.id('createNewGroupBtn')).tap();
      await expect(element(by.id('createNewGroupBtn'))).toBeNotVisible();
      // if group was created successfully we should be back at the Groups screen
      await expectGroupsScreen();
      // there should be exactly two groups now
      await expect(element(by.id('groupItem-0'))).toBeVisible();
      await expect(element(by.id('groupItem-1'))).toBeVisible();
    });

    it('invited co-founders should join group', async () => {
      const actionSheetTitle = 'What do you want to do?';
      const actionTitle = 'Join All Groups';

      await navigateHome();
      // open connection screen
      await element(by.id('connectionsBtn')).tap();
      // let all three connections join groups
      for (const i of [0, 1, 2]) {
        await waitFor(element(by.id('flagConnectionBtn')).atIndex(i))
          .toExist()
          .withTimeout(20000);
        await element(by.id('flagConnectionBtn')).atIndex(i).tap();
        // ActionSheet does not support testID, so try to match based on text.
        await expect(element(by.text(actionSheetTitle))).toBeVisible();
        await element(by.text(actionTitle)).tap();
        await element(by.text('OK')).tap();
      }
    });
  });

  describe('Groups screen search', () => {
    beforeAll(async () => {
      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // there should be two groups existing, so look for testID suffix '-1'
      await expect(element(by.id('groupItem-1'))).toBeVisible();
      // open search bar
      await element(by.id('SearchBarBtn')).tap();
    });

    afterEach(async () => {
      await element(by.id('SearchParam')).clearText();
    });

    afterAll(async () => {
      await navigateHome();
    });

    it(`should find group "${firstGroupName}"`, async () => {
      await element(by.id('SearchParam')).typeText('voir');
      await element(by.id('SearchParam')).tapReturnKey();
      await expect(element(by.text(firstGroupName))).toBeVisible();
      await expect(element(by.text(secondGroupName))).toBeNotVisible();
    });

    it(`should find group "${secondGroupName}"`, async () => {
      await element(by.id('SearchParam')).typeText('aster');
      await element(by.id('SearchParam')).tapReturnKey();
      await expect(element(by.id('SearchParam'))).toHaveText('aster');
      await expect(element(by.text(secondGroupName))).toBeVisible();
      await expect(element(by.text(firstGroupName))).toBeNotVisible();
    });

    it('should show "no match" info', async () => {
      await element(by.id('SearchParam')).typeText('not matching');
      await element(by.id('SearchParam')).tapReturnKey();
      await expect(element(by.id('noMatchText'))).toBeVisible();
    });

    test.todo('match by group member name');
  });

  describe('Group Management', () => {
    beforeAll(async () => {
      // navigate to groups screen
      await element(by.id('groupsBtn')).tap();
      await expectGroupsScreen();
      // there should be two groups existing, so look for testID suffix '-1'
      await expect(element(by.id('groupItem-1'))).toBeVisible();
    });

    beforeEach(async () => {
      // make sure to be on the groups tab/screen before starting tests
      await expectGroupsScreen();
      await element(by.id('groupsFlatList')).swipe('down');
      await expectGroupsScreen();
    });

    afterAll(async () => {
      await navigateHome();
    });

    // this is failing on iOS
    // it('group should have ellipsis menu', async () => {
    //   // select first group
    //   await element(by.id('groupItem-0')).tap();
    //   await expect(element(by.id('groupOptionsBtn'))).toBeVisible();
    //   await element(by.id('groupOptionsBtn')).tap();
    //   // now actionsheet should be open
    //   await expect(element(by.text('What do you want to do?'))).toBeVisible();
    //   await expect(element(by.text('Invite'))).toBeVisible();
    //   await expect(element(by.text('Leave Group'))).toBeVisible();
    //   await expect(element(by.text('cancel'))).toBeVisible();
    //   // close actionsheet without changing anything
    //   await element(by.text('cancel')).tap();
    //   await expect(element(by.id('membersView'))).toBeVisible();
    //   await element(by.id('header-back')).tap();
    // });

    it('should leave first group and cancel', async () => {
      await element(by.id('groupItem-0')).tap();
      await expect(element(by.id('groupOptionsBtn'))).toBeVisible();
      await element(by.id('groupOptionsBtn')).tap();
      await expect(element(by.text('Leave Group'))).toBeVisible();
      await element(by.text('Leave Group')).tap();
      // back out with CANCEL button
      await element(by.text(cancelText)).tap();
      await expect(
        element(by.text('What do you want to do?')),
      ).toBeNotVisible();
      await expect(element(by.id('membersView'))).toBeVisible();
      await element(by.id('header-back')).tap();
    });

    it('should leave first group and confirm', async () => {
      await element(by.id('groupItem-0')).tap();
      await expect(element(by.id('groupOptionsBtn'))).toBeVisible();
      await element(by.id('groupOptionsBtn')).tap();
      await element(by.text('Leave group')).tap();
      // confirm with OK button
      await element(by.text('OK')).tap();
      // should be back at groups screen
      await expectGroupsScreen();
      // only one group should be left
      await expect(element(by.id('groupItem-1'))).not.toExist();
    });

    test.todo('should invite connection to group');
    test.todo('should dismiss member from group');
    test.todo('should promote member of group to admin');
  });
});
