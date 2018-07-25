import * as React from "react";

import logo from "./logo.svg";

import * as classes from "./App.css";
const pc: RTCPeerConnection = new RTCPeerConnection({});

function negotiate() {
  return pc
    .createOffer()
    .then(function(offer) {
      return pc.setLocalDescription(offer);
    })
    .then(function() {
      // wait for ICE gathering to complete
      return new Promise(function(resolve) {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          function checkState() {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              resolve();
            }
          }
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });
    })
    .then(function() {
      var offer = pc.localDescription;
      if (!offer) {
        throw new Error("No offer");
      }
      // document.getElementById("offer-sdp").textContent = offer.sdp;
      return fetch("http://0.0.0.0:8080/offer", {
        body: JSON.stringify({
          sdp: offer.sdp,
          type: offer.type
          // video_transform: document.getElementById("video-transform").value
        }),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
    })
    .then(function(response) {
      return response.json();
    })
    .then(function(answer) {
      // document.getElementById("answer-sdp").textContent = answer.sdp;
      return pc.setRemoteDescription(answer);
    });
}
function stop() {
  // close data channel
  // if (dc) {
  //   dc.close();
  // }

  // close audio / video
  (pc as any).getSenders().forEach(function(sender: any) {
    sender.track.stop();
  });

  // close peer connection
  setTimeout(function() {
    pc.close();
  }, 500);
}

class App extends React.Component {
  state = {
    recording: false
  };
  dataChannelLog: HTMLElement | null = null;
  private recordStart = () => {
    this.setState({ recording: true });
    chrome.tabCapture.capture({ audio: true }, stream => {
      if (!stream) {
        throw new Error("OH NOOO");
      }
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.controls = false;
      audio.srcObject = stream;

      // const audioCtx = new AudioContext();
      // const source = audioCtx.createMediaStreamSource(stream);
      stream.getTracks().forEach(function(track) {
        (pc as any).addTrack(track, stream);
      });
      negotiate();
    });

    if (this.dataChannelLog === null) {
      throw new Error("Data channel not available");
    }
    let dataChannelLog = this.dataChannelLog;
    const dc = (pc as any).createDataChannel("chat");
    let dcInterval: number | undefined;
    dc.onclose = function() {
      // clearInterval(dcInterval);
      dataChannelLog.textContent += "- close\n";
    };
    dc.onopen = function() {
      dataChannelLog.textContent += "- open\n";
      // dcInterval = setInterval(function() {
      //   var message = "ping";
      //   dataChannelLog.textContent += "> " + message + "\n";
      //   dc.send(message);
      // }, 1000) as any;
    };
    dc.onmessage = function(evt: any) {
      dataChannelLog.textContent += "< " + evt.data + "\n";
    };
  };
  private recordStop = () => {
    stop();
    this.setState({ recording: false });
  };
  public render() {
    return (
      <div className={classes.container}>
        {!this.state.recording ? (
          <a className={classes.record} onClick={this.recordStart}>
            Record
          </a>
        ) : (
          <a className={classes.recording} onClick={this.recordStop}>
            Stop
          </a>
        )}
        <div ref={c => (this.dataChannelLog = c)}>Datachannel</div>
      </div>
    );
  }
}

export default App;
