import { createElement, Component } from 'preact';
import style from './style';
import { gql } from '@apollo/client';
import { ModalDialog } from '@zimbra-client/components';

// On the server you can run the following command to get the Zimlet User Properties:
// zmprov ga user@example.com zimbraZimletUserProperties

export default class Display extends Component {
    constructor(props) {
        super(props);
        this.zimletContext = props.children.context;
    };

    fetchData = () => {
        //if we already parsed and cached our Zimlet User Properties, display them
        if (this.zimletContext.zimletProperties) {
            this.showDialog();
        }
        else {
            //Fetch Zimlet User Properties from server parse and save them to Zimlet context
            //Create new empty map to store the test Zimlet properties
            this.zimletContext.zimletProperties = new Map();

            //this gql query is used to get all current saved Zimlet properties for all Zimlets for the current user from the server
            this.zimletProps = gql`
                query AccountInfo {
                    accountInfo {
                        id
                        props {
                            prop {
                                zimlet
                                name
                                _content
                            }
                        }
                    } 
                }`;

            //https://www.freecodecamp.org/news/react-apollo-client-2020-cheatsheet/#usingtheclientdirectly
            this.context.client.query({
                query: this.zimletProps
            })
                .then((response) => {
                    if (response.data.accountInfo.props.prop) {
                        //Filter out the test-zimlet properties, excluding all other Zimlets
                        //add all our properties to an ES6 Map
                        const propArray = response.data.accountInfo.props.prop;
                        for (var i = 0; i < propArray.length; i++) {
                            if ((propArray[i].zimlet == "test-zimlet") && (propArray[i].__typename == "Prop")) {
                                this.zimletContext.zimletProperties.set(propArray[i].name, propArray[i]._content);
                            }
                        }
                        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
                        //Now you can get a property value by doing: zimletProperties.get('name-of-property')
                        this.showDialog();
                    }
                })
                .catch((err) => console.error(err));
        }
    }

    showDialog = () => {
        this.modal = (
            <ModalDialog
                class={style.modalDialog}
                contentClass={style.modalContent}
                innerClass={style.inner}
                onClose={this.handleClose}
                cancelButton={false}
                header={false}
                footer={false}
            >
                <div class="zimbra-client_modal-dialog_inner"><header class="zimbra-client_modal-dialog_header"><h2>Test Zimlet Properties</h2><button onClick={this.handleClose} aria-label="Close" class="zimbra-client_close-button_close zimbra-client_modal-dialog_actionButton"><span role="img" class="zimbra-icon zimbra-icon-close blocks_icon_md"></span></button></header>
                    <div class="zimbra-client_modal-dialog_content zimbra-client_language-modal_languageModalContent">
                        <lable for='prop1'>prop1:</lable><input name='prop1' id='prop1' value={this.zimletContext.zimletProperties.get('prop1') || null}></input>
                    </div>
                    <footer class="zimbra-client_modal-dialog_footer"><button type="button" onClick={this.handleSave} class="blocks_button_button blocks_button_regular">OK</button></footer>
                </div>
            </ModalDialog>
        );

        const { dispatch } = this.zimletContext.store;
        dispatch(this.zimletContext.zimletRedux.actions.zimlets.addModal({ id: 'addEventModal', modal: this.modal }));
    }

    handleSave = e => {
        //Get value from user input
        const prop1 = window.parent.document.getElementById('prop1').value;

        //Update Zimlet User Properties cache in the Zimlet Context 
        this.zimletContext.zimletProperties.set('prop1', prop1);

        //The gql mutation that stores to ldap zimbraZimletUserProperties on the server
        const myMutationGql = gql`
            mutation myMutation($props: [PropertiesInput!]) {
                modifyProps(props: $props)
            }`;

        //Use the Apollo client directly to run the query, save prop1 on the server
        //https://stackoverflow.com/questions/56417197/apollo-mutations-without-react-mutation-component
        this.context.client.mutate({
            mutation: myMutationGql,
            variables: {
                props: [
                    {
                        zimlet: "test-zimlet",
                        name: 'prop1',
                        _content: prop1
                    }
                ]
            }
        });

        //Close the dialog
        const { dispatch } = this.zimletContext.store;
        return e && e.isTrusted && dispatch(this.zimletContext.zimletRedux.actions.zimlets.addModal({ id: 'addEventModal' }));
    }

    handleClose = e => {
        //Close the dialog without saving
        const { dispatch } = this.zimletContext.store;
        return e && e.isTrusted && dispatch(this.zimletContext.zimletRedux.actions.zimlets.addModal({ id: 'addEventModal' }));
    }

    render() {
        return (
            <div onClick={this.fetchData} class="zimbra-client_menu-item_navItem zimbra-client_action-menu-item_item">
                <span class="zimbra-client_action-menu-item_icon">
                    <span role="img" class="zimbra-icon zimbra-icon-about blocks_icon_md"></span></span>
                <span class="zimbra-client_menu-item_inner">Zimlet Properties Test</span></div>
        );
    }
}
