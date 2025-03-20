A personal collection of terminal commands and shortcuts that I find useful but tend to forget. This document serves as my go-to resource when I need to recall specific command line operations for development and system management tasks. This reference will grow over time as I discover new useful commands worth remembering.

- [PyPi Publishing](#pypi-publishing)
- [Archiving](#archiving)
- [File and Directory](#file-and-directory)

## PyPI Publishing
1. Update `setup.py` and `repository/__init__.py`
2. `cd path/to/repository/`
3. Create distribution packages with:
```python
python -m pip install --upgrade pip
python -m pip install --upgrade build
python -m build
```
3. Check packages with Twine:
```python
python -m pip install --upgrade twine
python -m twine check dist/*
```
4. Upload packages to PyPI:
```python
python -m twine upload dist/*
```
5. Enter API token

## Archiving
### .tar.gz
- Archive current directory: `tar -czvf "$(basename $(pwd)).tar.gz" .`
- Archive current directory with rename: `tar -czvf archive.tar.gz .`
- Extract archive in current directory: `tar -xzvf archive.tar.gz`
- Extract archive to different directory: `tar -xzvf archive.tar.gz -C /path/to/target`
### .zip
- Archive current directory: `zip -r "$(basename $(pwd)).zip" .`
- Archive current directory with rename: `zip -r custom_name.zip .`
- Extract archive in current directory: `unzip archive.zip`
- Extract archive to different directory: `unzip archive.zip -d /path/to/target`

## File and Directory
### Flags
- No overwrite: `-n` (no-clobber)
- Force overwrite: `-f` (force)
- All subdirectories: `-r` (recursive; to get whole directory)
- Prompt before overwrite: `i`
- Verbose: `v`
- Combined: `-rn`, `rf`, etc.
### Copy, Move, Rename, Create, Delete
- Copy file to another directory: `cp filename /path/to/destination/`
- Copy directory to another location: `cp -r directory/ /path/to/destination/`
- Move file to another directory: `mv filename /path/to/destination/`
- Move directory to another location: `mv directory/ /path/to/destination/`
- Rename file: `mv oldname.txt newname.txt`
- Rename directory: `mv olddirectory/ newdirectory/`
- Rename file by copy/move: `cp/mv oldname.txt /path/to/destination/newname.txt`
- Rename directory by copy/move: `cp/mv oldname/ /path/to/destination/newname/`
- Create new file: `touch filename`
- Create new directory: `mkdir directory/`
- Delete file: `rm filename`
- Delete directory: `rm -r directory/`
- Delete files in directory: `rm directory/*` or `rm -r directory/*`
