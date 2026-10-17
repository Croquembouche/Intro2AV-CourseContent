"""Regression checks for recovery after the server outlasts an HTTP timeout."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import capture_session


class CaptureRecovery(unittest.TestCase):
    def test_stop_timeout_resumes_same_session_without_second_stop(self):
        calls=[]
        def request(base,path,payload=None):
            calls.append(path)
            if path=='/api/status':
                recording=None if calls.count(path)==1 else {'id':'saved-session','start_sim_time':0,'end_sim_time':5}
                return {'recording':recording,'running':True,'mode':'live'}
            if path.endswith('record-start'):
                return {'id':'saved-session'}
            if path.endswith('record-stop'):
                raise TimeoutError('server still hashing')
            raise AssertionError(path)
        with tempfile.TemporaryDirectory() as directory:
            args=['capture_session.py','--url','http://example.invalid','--output',str(Path(directory)/'capture')]
            with patch('sys.argv',args),patch.object(capture_session,'request',side_effect=request),patch.object(capture_session.time,'sleep'),patch.object(capture_session,'download_session') as download:
                capture_session.main()
                self.assertEqual(download.call_args.args[1],'saved-session')
                self.assertEqual(calls.count('/api/command/record-stop'),1)
                self.assertEqual(calls.count('/api/command/record-start'),1)

    def test_resume_does_not_record_again(self):
        with tempfile.TemporaryDirectory() as directory:
            args=['capture_session.py','--url','http://example.invalid','--output',directory,'--resume-session','existing']
            with patch('sys.argv',args),patch.object(capture_session,'request') as request,patch.object(capture_session,'download_session') as download:
                capture_session.main()
                request.assert_not_called()
                self.assertEqual(download.call_args.args[1],'existing')


if __name__=='__main__':
    unittest.main()
