# Imports
from google.cloud import speech
from google.cloud.speech import enums
from google.cloud.speech import types
import io
import argparse
import os

os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.path.join(os.path.dirname(__file__), "google-speech.json")

# GOOGLE_SPEECH_API_KEY = "AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw"
# GOOGLE_SPEECH_API_URL = "http://www.google.com/speech-api/v2/recognize" + \
#                         "?client=chromium&lang={lang}&key={key}"


# Transcribes a streaming file into text
def transcribe_streaming(stream_file, enable_speaker_diarization=False):
    client = speech.SpeechClient()

    with io.open(stream_file, 'rb') as audio_file:
        content = audio_file.read()

    # In practice, stream should be a generator yielding chunks of audio data.
    stream = [content]
    requests = (types.StreamingRecognizeRequest(audio_content=chunk) for chunk in stream)

    config = types.RecognitionConfig(
        encoding=enums.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code='en-US')
    # enable_speaker_diarization=enable_speaker_diarization
    ## enable_speaker_diarization=True, diarization_speaker_count=2
    #         api_key=GOOGLE_SPEECH_API_KEY
    ## enable_word_confidence=True

    streaming_config = types.StreamingRecognitionConfig(config=config)

    # streaming_recognize returns a generator.
    responses = client.streaming_recognize(streaming_config, requests)

    for response in responses:
        # Once the transcription has settled, the first result will contain the
        # is_final result. The other results will be for subsequent portions of
        # the audio.
        for result in response.results:
            # yield result.is_final

            print('Finished: {}'.format(result.is_final))
            print('Stability: {}'.format(result.stability))
            alternatives = result.alternatives

            # The alternatives are ordered from most likely to least.
            for alternative in alternatives:
                print('Confidence: {}'.format(alternative.confidence))
                print(u'Transcript: {}'.format(alternative.transcript))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('stream', help='File to stream to the API')
    args = parser.parse_args()
    transcribe_streaming(args.stream)
