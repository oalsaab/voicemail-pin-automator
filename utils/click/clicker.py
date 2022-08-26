from ctypes import windll
from time import sleep
from sys import argv

def clicking(x, y):  
    click = windll.user32  
    click.SetCursorPos(x, y) # Set mouse cursor position
    click.mouse_event(2, 0, 0, 0, 0) # Left mouse button down  (0x0002)
    click.mouse_event(4, 0, 0, 0, 0) # Left mouse button up  (0x0004)
    sleep(2)
    click.mouse_event(2, 0, 0, 0, 0) # Left mouse button down  (0x0002)
    click.mouse_event(4, 0, 0, 0, 0) # Left mouse button up  (0x0004)

clicking(int(argv[1]), int(argv[2]))