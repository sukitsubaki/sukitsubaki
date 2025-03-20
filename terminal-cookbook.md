A personal collection of terminal commands and shortcuts that I find useful but tend to forget. This document serves as my go-to resource when I need to recall specific command line operations for development and system management tasks.
This reference will grow over time as I discover new useful commands worth remembering.

# PyPI: Publishing
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
