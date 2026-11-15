#include <stdio.h>
#include <string.h>
int main() { char B[60]; int N; N = sprintf(B, "%d-%02d-%s", 2026, 3, "x"); printf("%d [%s] %d\n", N, B, (int) strlen(B)); N = snprintf(B, 6, "%s", "abcdefghij"); printf("%d [%s]\n", N, B); sprintf(B, "%5.1f|%x", 2.25, 255); puts(B); return 0; }
