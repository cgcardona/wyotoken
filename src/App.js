import React, { Component } from 'react';
import { Button, Form, FormGroup, Label, Input, FormText, Container, Row, Col } from 'reactstrap';
import logo from './logo.png';
import QRCode from 'qrcode.react';
import {
  Collapse,
  Navbar,
  NavbarToggler,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem } from 'reactstrap';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
let BITBOXCli = require('bitbox-cli/lib/bitbox-cli').default;
let BITBOX = new BITBOXCli({
  restUrl: 'https://trest.bitcoin.com/v1/'
});
let wormhole = require("wormholecash/lib/Wormhole").default;
let Wormhole = new wormhole({
  restURL: 'https://wormholecash-staging.herokuapp.com/v1/'
});

let mnemonic = 'remain bring turkey race next ivory direct crunch dwarf material correct oak intact copper jaguar lottery hope under kingdom robot leopard call giggle genuine';

// root seed buffer
let rootSeed = BITBOX.Mnemonic.toSeed(mnemonic);

// master HDNode
let masterHDNode = BITBOX.HDNode.fromSeed(rootSeed, 'testnet');

// HDNode of BIP44 account
let account = BITBOX.HDNode.derivePath(masterHDNode, "m/44'/145'/0'");

// derive the first external change address HDNode which is going to spend utxo
let change = BITBOX.HDNode.derivePath(account, "0/0");
let change2 = BITBOX.HDNode.derivePath(account, "0/1");

// get the cash address
let cashAddress = BITBOX.HDNode.toCashAddress(change);
let cashAddress2 = BITBOX.HDNode.toCashAddress(change2);

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      name: '',
      category: '',
      subcategory: 'subcategory',
      url: '',
      description: '',
      tokenManagementAddress: '',
      amount: '',
      stepOne: true,
      showStepOneSuccess: false,
      showManagement: false,
      grantee: '',
      showCheckout: false
    }
  }

  async handleSubmit(e) {
    e.preventDefault();

    let managed = await Wormhole.PayloadCreation.managed(1, 0, 0, this.state.category, this.state.subcategory, this.state.name, this.state.url, this.state.description);
    let utxo = [{
      txid: "b8f2a774504bc13f720de1502b57c2da3ad114255253dbbc2673cb0c39dab3e8",
      vout: 0,
      scriptPubKey: "76a91423da806c2dbf8f7381c391d1018cec0f963d491888ac",
      amount: 0.00198362,
      value: 0.00198362,
      satoshis: 198362
    }];

    let rawTx = await Wormhole.RawTransactions.create(utxo, {});
    let opReturn = await Wormhole.RawTransactions.opReturn(rawTx, managed);
    let ref = await Wormhole.RawTransactions.reference(opReturn, cashAddress);
    let changeHex = await Wormhole.RawTransactions.change(ref, utxo, cashAddress, 0.00006);

    let tx = Wormhole.Transaction.fromHex(changeHex)
    let tb = Wormhole.Transaction.fromTransaction(tx)

    let keyPair = Wormhole.HDNode.toKeyPair(change);
    let redeemScript;
    tb.sign(0, keyPair, redeemScript, 0x01, utxo[0].satoshis);
    let builtTx = tb.build()
    let txHex = builtTx.toHex();
    let txid = await Wormhole.RawTransactions.sendRawTransaction(txHex);
    console.log("SUCCESS: ", txid)
    this.setState({
      stepOne: false,
      showStepOneSuccess: true
    });
  }

  async handleTokenCreation(e) {
    e.preventDefault();
    let grant = await Wormhole.PayloadCreation.grant(196, "100");

    let utxo = [{
      txid: "49eb18e148a1499d987851f3890d4422b81a7b593170b8c15ca4d032e11194cd",
      vout: 0,
      scriptPubKey: "76a91423da806c2dbf8f7381c391d1018cec0f963d491888ac",
      amount: 0.00191816,
      value: 0.00191816,
      satoshis: 191816
    }];
    let rawTx = await Wormhole.RawTransactions.create([utxo], {});
    let opReturn = await Wormhole.RawTransactions.opReturn(rawTx, grant);
    let ref = await Wormhole.RawTransactions.reference(opReturn, cashAddress2);
    let changeHex = await Wormhole.RawTransactions.change(ref, [utxo], cashAddress, 0.00006);

    let tx = Wormhole.Transaction.fromHex(changeHex)
    let tb = Wormhole.Transaction.fromTransaction(tx)

    let keyPair = Wormhole.HDNode.toKeyPair(change);
    let redeemScript;
    tb.sign(0, keyPair, redeemScript, 0x01, utxo.satoshis);
    let builtTx = tb.build()
    let txHex = builtTx.toHex();
    console.log(txHex)
    let txid = await Wormhole.RawTransactions.sendRawTransaction(txHex);
    console.log("SUCCESS: ", txid)
    this.setState({
      showManagement: false,
      showCheckout: true
    });
  }

  handleInputChange(e) {
    let value = e.target.value;
    let id = e.target.id;
    let obj = {};
    obj[id] = value;
    this.setState(obj);
  }

  bip21Address(address, amount) {
    let options = {
      amount: amount,
      label: "mah label",
      message: "bitbox ftw"
    };
    return BITBOX.BitcoinCash.encodeBIP21(address, options);
  }

  render() {
    let stepOneMarkup = [];
    if(this.state.stepOne)  {
      stepOneMarkup.push(
        <Row>
          <Col>
            <h2 className='stepHeaders'>Step 1: Define your token</h2>
            <Form onSubmit={this.handleSubmit.bind(this)}>
              <FormGroup>
                <Input className='inputField' onChange={this.handleInputChange.bind(this)} type="text" name="name" id="name" placeholder="Name" value={this.state.name} />
              </FormGroup>
              <FormGroup>
                <Input className='inputField' onChange={this.handleInputChange.bind(this)} type="text" name="category" id="category" placeholder="Category" value={this.state.category} />
              </FormGroup>
              <FormGroup>
                <Input className='inputField' onChange={this.handleInputChange.bind(this)} type="text" name="url" id="url" placeholder="Url" value={this.state.url} />
              </FormGroup>
              <FormGroup>
                <Input className='inputField'  onChange={this.handleInputChange.bind(this)} type="text" name="description" id="description" placeholder="Description" value={this.state.description}/>
              </FormGroup>
              <FormGroup>
                <Input className='inputField' onChange={this.handleInputChange.bind(this)} type="text" name="tokenManagementAddress" id="tokenManagementAddress" placeholder="Token Management Address" value={this.state.tokenManagementAddress} />
              </FormGroup>
              <Button>Submit</Button>
            </Form>
          </Col>
        </Row>
      );
    }

    let successMarkup = [];
    if(this.state.showStepOneSuccess)  {
      successMarkup.push(
        <Container>
          <Row>
            <Col>
              <h2 className='stepHeaders'>Step 2: Send $.01 (miners fee)</h2>
            </Col>
          </Row>
          <Row className='payment'>
            <Col>
              <QRCode value={cashAddress} className='qrcode' />
            </Col>
          </Row>
        </Container>
      )

      setTimeout(() => {
        this.setState({
          showStepOneSuccess: false,
          showManagement: true
        });
      }, 3000);
    }

    let managementMarkup = [];
    if(this.state.showManagement) {
      managementMarkup.push(
        <Row>
          <Col>
            <h2 className ='stepHeaders'>Step 3: Grant Tokens</h2>
            <Form onSubmit={this.handleTokenCreation.bind(this)}>
              <FormGroup>
                <Input onChange={this.handleInputChange.bind(this)} type="text" name="grantee" id="grantee" placeholder="Grantee" value={this.state.grantee} />
              </FormGroup>
              <FormGroup>
                <Input onChange={this.handleInputChange.bind(this)} type="text" name="amount" id="amount" placeholder="Number of tokens to create" value={this.state.amount} />
              </FormGroup>
              <FormGroup>
                <Input onChange={this.handleInputChange.bind(this)} type="text" name="purchasePrice" id="purchasePrice" placeholder="Purchase price in USD" value={this.state.purchasePrice} />
              </FormGroup>
              <Button>Submit</Button>
            </Form>
          </Col>
        </Row>
      )
    }

    let checkoutMarkup = [];
    if(this.state.showCheckout) {
      checkoutMarkup.push(
        <Row>
          <Col>
            <QRCode value={this.bip21Address(this.state.tokenManagementAddress, this.state.purchasePrice)} className='qrcode' />
          </Col>
        </Row>
      )
    }

    return (
      <Container>
        <Navbar className='titleRow header'>
          <Col>
            <img src={logo} className="App-logo" alt="logo" />
          </Col>
        </Navbar>
        <Row>
          <Col className='title'>
            <h1>WyoToken Utility Token Generator</h1>
          </Col>
        </Row>
        <hr />
        {stepOneMarkup}
        {successMarkup}
        {managementMarkup}
        {checkout}

        <div className="footer">
          <Navbar expand="md">
            <NavbarBrand href="https://www.wyohackathon.io">WyoHackathon</NavbarBrand>
            <NavbarToggler onClick={this.toggle} />
            <Collapse isOpen={this.state.isOpen} navbar>
              <Nav className="ml-auto" navbar>
                <NavItem>
                  <NavLink href="http://www.wyoleg.gov/2018/Digest/HB0070.pdf">More info on HB70</NavLink>
                </NavItem>
              </Nav>
            </Collapse>
          </Navbar>
        </div>

      </Container>
    );
  }
}

export default App;
